/**
 * SISTEMA DE AGENDAMENTO - LABORATÓRIO DE MISTURAS ASFÁLTICAS (LMP)
 * Versão: 2.1 - Correção de Redirecionamento e Confirmação Visual
 */

const URL_API = "https://script.google.com/macros/s/AKfycbzGPqygb9dsbUi5JC_JuBvWvWCU0WzsyciR-ocfr-lhg2zAze9d4TyW9YfKsiNv91Ll/exec";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina'); 
let reservasGlobais = {};
let selecoesTemporarias = new Set();

// --- CONFIGURAÇÕES DE CONFLITO ---
const maquinasEstufa = ["1", "2", "4", "8", "9", "13"]; 
const maquinasPrioritarias = ["1", "2"]; 

// --- LIMITAÇÃO DE DATA ---
if (seletorData) {
    const hoje = new Date();
    const dataMinima = hoje.toISOString().split("T")[0];
    const duasSemanasDepois = new Date();
    duasSemanasDepois.setDate(hoje.getDate() + 14);
    const dataMaxima = duasSemanasDepois.toISOString().split("T")[0];
    
    seletorData.min = dataMinima;
    seletorData.max = dataMaxima;
    if (!seletorData.value) seletorData.value = dataMinima;
}

const instrucoesMaquinas = {
    "1": "Equipamentos: Balança, Compactador Marshall, Estufa, Misturador.",
    "2": "Equipamentos: Balança, Bomba de vácuo, Compactador Giratório.",
    "3": "Equipamentos: Extrator Centrifugo (Rotarex).",
    "4": "Equipamentos: Balança e Estufa.",
    "5": "Equipamentos: Quarteador.",
    "6": "Equipamentos: Maquina Los Angeles e Peneiras.",
    "7": "Equipamentos: Balança e recipientes.",
    "8": "Equipamentos: Estufa e vidrarias.",
    "9": "Equipamentos: Estufa e equipamento de tração.",
    "10": "Equipamentos: Peneiras e agitador.",
    "11": "Equipamentos: Paquímetro ou gabarito.",
    "12": "Equipamentos: Solução de Sulfato.",
    "13": "Equipamentos: Estufa."
};

function mostrarInstrucoes() {
    const textoInstrucoes = document.getElementById('texto-instrucoes');
    if (!textoInstrucoes) return;

    let tutorial = `
        <strong>Como funciona:</strong><br>
        1. Escolha o Ensaio e a Data.<br>
        2. Marque os horários disponíveis.<br>
        3. Preencha seus dados e a senha do lab.<br>
        4. Clique em Confirmar e aguarde o aviso para abrir o WhatsApp.<br>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">
    `;

    if (!seletorMaquina.value) {
        textoInstrucoes.innerHTML = tutorial + "<em>Selecione um ensaio para ver os detalhes.</em>";
        return;
    }

    const maquinaId = seletorMaquina.value.split(' ')[0]; 
    textoInstrucoes.innerHTML = tutorial + "<strong>Equipamentos deste ensaio:</strong><br>" + (instrucoesMaquinas[maquinaId] || "");
}

async function carregarReservas() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '<tr><td colspan="3">Sincronizando com a planilha...</td></tr>';
    try {
        const response = await fetch(URL_API);
        reservasGlobais = await response.json();
        atualizarAgenda();
    } catch (e) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">Erro ao ler dados da planilha.</td></tr>';
    }
}

function atualizarAgenda() {
    if (!corpoAgenda || !seletorData.value) return;
    
    const dataObj = new Date(seletorData.value + 'T00:00:00');
    if (dataObj.getDay() === 0 || dataObj.getDay() === 6) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:orange; text-align:center;">⚠️ Fechado aos fins de semana.</td></tr>';
        return;
    }

    corpoAgenda.innerHTML = '';
    const dataSelecionada = seletorData.value;
    const maquinaTexto = seletorMaquina.value || "LMP";
    const idMaquina = maquinaTexto.split(' ')[0];

    mostrarInstrucoes();

    for (let hora = 7; hora <= 16; hora++) {
        const horarioFormatado = `${hora.toString().padStart(2, '0')}:00 - ${(hora + 1).toString().padStart(2, '0')}:00`;
        const chaveAtual = `${dataSelecionada}-${maquinaTexto}-${hora}`;
        
        let motivoBloqueio = "";
        const nomeReserva = reservasGlobais[chaveAtual];

        let temDosagem = false;
        let temOutraEstufa = false;
        Object.keys(reservasGlobais).forEach(ch => {
            if (ch.startsWith(dataSelecionada) && ch.endsWith(`-${hora}`)) {
                const idExistente = ch.split('-')[3]?.split(' ')[0];
                if (maquinasPrioritarias.includes(idExistente)) temDosagem = true;
                if (maquinasEstufa.includes(idExistente) && !maquinasPrioritarias.includes(idExistente)) temOutraEstufa = true;
            }
        });

        if (nomeReserva) motivoBloqueio = `Reservado: ${nomeReserva}`;
        else if (maquinasPrioritarias.includes(idMaquina) && temOutraEstufa) motivoBloqueio = "Estufa ocupada";
        else if (["4", "8", "9", "13"].includes(idMaquina) && temDosagem) motivoBloqueio = "Prioridade: Dosagem";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horarioFormatado}</td>
            <td class="${motivoBloqueio ? 'ocupado' : 'status-disponivel'}">${motivoBloqueio || 'Disponível'}</td>
            <td>${motivoBloqueio ? '---' : `<input type="checkbox" value="${chaveAtual}" onchange="gerenciarSelecao(this)">`}</td>
        `;
        corpoAgenda.appendChild(tr);
    }
}

function gerenciarSelecao(checkbox) {
    checkbox.checked ? selecoesTemporarias.add(checkbox.value) : selecoesTemporarias.delete(checkbox.value);
}

async function reservarSelecionados() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const orientador = document.getElementById('orientador').value;
    const senha = document.getElementById('senha-lab').value;

    if (!senha || !nome) return alert("Preencha o nome e a senha do laboratório!");
    if (selecoesTemporarias.size === 0) return alert("Selecione pelo menos um horário na tabela.");

    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    const textoOriginal = btn.innerText;
    btn.innerText = "⏳ Gravando na Planilha...";
    btn.disabled = true;

    const ID_UNICO = "ID-" + Date.now();
    const payload = {
        action: 'reservar_lote',
        id: ID_UNICO,
        senha: senha,
        usuario: { nome, email, orientador },
        reservas: Array.from(selecoesTemporarias).map(ch => ({ chave: ch, maquina: seletorMaquina.value })),
        data: seletorData.value
    };

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const resultText = await response.text();
        
        if (resultText.includes("Sucesso")) {
            // CONFIRMAÇÃO VISUAL ANTES DO WHATSAPP
            alert("✅ Agendamento salvo com sucesso!\n\nAgora você será redirecionado para o WhatsApp para enviar a solicitação de aprovação.");

            const horas = Array.from(selecoesTemporarias).map(ch => ch.split('-').pop() + ":00").sort().join(', ');
            let msg = `🔬 *Novo Agendamento LMP*\n\n`;
            msg += `*ID:* ${ID_UNICO}\n`;
            msg += `*Solicitante:* ${nome}\n`;
            msg += `*Ensaio:* ${seletorMaquina.value}\n`;
            msg += `*Data:* ${seletorData.value}\n`;
            msg += `*Horas:* ${horas}\n\n`;
            msg += `✅ *ACEITAR:* \n${URL_API}?id=${ID_UNICO}&acao=Aceito\n\n`;
            msg += `❌ *RECUSAR:* \n${URL_API}?id=${ID_UNICO}&acao=Recusado`;

            window.open(`https://wa.me/5585988179510?text=${encodeURIComponent(msg)}`, '_blank');
            
            // Limpa tudo para o próximo uso
            selecoesTemporarias.clear();
            document.getElementById('senha-lab').value = "";
            carregarReservas();
        } else {
            alert("⚠️ " + resultText);
        }
    } catch (e) {
        alert("Erro de conexão: Verifique se o script está publicado como 'Qualquer pessoa'.");
    } finally {
        btn.disabled = false;
        btn.innerText = textoOriginal;
    }
}

// Inicialização
seletorData.addEventListener('change', atualizarAgenda);
seletorMaquina.addEventListener('change', atualizarAgenda);
carregarReservas();
