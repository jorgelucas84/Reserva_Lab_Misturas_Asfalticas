/**
 * SISTEMA DE AGENDAMENTO - LABORATÓRIO DE MISTURAS ASFÁLTICAS (LMP)
 * Link da Planilha: https://docs.google.com/spreadsheets/d/1o49JtvBfPkNFh703zXam5_9QD_qCQCxUtGD8-E5Uc_g/edit
 */

const URL_API = "https://script.google.com/macros/s/AKfycbx2i7ZcdLE4qyU9RDtIeWZj0bpNIf5Ol2ULlnpy2V3xZfdAVe4kmlApmCbW0DxLQw/exec";
const PLANILHA_URL = "https://docs.google.com/spreadsheets/d/1o49JtvBfPkNFh703zXam5_9QD_qCQCxUtGD8-E5Uc_g/edit";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina'); 
let reservasGlobais = {};
let selecoesTemporarias = new Set();

// --- CONFIGURAÇÕES DE CONFLITO ---
const maquinasEstufa = ["1", "2", "4", "8", "9", "13"]; 
const maquinasPrioritarias = ["1", "2"]; // Marshall e Superpave fecham a estufa

// --- LIMITAÇÃO DE DATA (Máximo 2 semanas) ---
if (seletorData) {
    const hoje = new Date();
    const dataMinima = hoje.toISOString().split("T")[0];
    
    const duasSemanasDepois = new Date();
    duasSemanasDepois.setDate(hoje.getDate() + 14);
    const dataMaxima = duasSemanasDepois.toISOString().split("T")[0];
    
    seletorData.min = dataMinima;
    seletorData.max = dataMaxima;
}

const instrucoesMaquinas = {
    "1": "Seguir as instruções gerais. Equipamentos: Balança, Compactador Marshall, Estufa, Misturador.",
    "2": "Seguir as instruções gerais. Equipamentos: Balança, Bomba de vácuo, Compactador Giratório.",
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

function configurarDataAtual() {
    if (seletorData && !seletorData.value) {
        seletorData.value = new Date().toISOString().split('T')[0];
    }
}

function mostrarInstrucoes() {
    const textoInstrucoes = document.getElementById('texto-instrucoes');
    if (!textoInstrucoes || !seletorMaquina.value) return;
    const maquinaId = seletorMaquina.value.split(' ')[0]; 
    const instrucao = instrucoesMaquinas[maquinaId];
    textoInstrucoes.innerHTML = instrucao ? instrucao.replace(/\n/g, "<br>") : "Selecione um ensaio.";
}

async function carregarReservas() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '<tr><td colspan="3">Sincronizando com a planilha...</td></tr>';
    try {
        const response = await fetch(URL_API);
        const texto = await response.text();
        reservasGlobais = JSON.parse(texto);
        atualizarAgenda();
    } catch (e) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">Erro ao ler dados da planilha.</td></tr>';
    }
}

function atualizarAgenda() {
    if (!corpoAgenda) return;
    const dataObj = new Date(seletorData.value + 'T00:00:00');
    const diaSemana = dataObj.getDay(); 
    
    if (diaSemana === 0 || diaSemana === 6) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:orange; text-align:center;">⚠️ Laboratório fechado aos fins de semana.</td></tr>';
        return;
    }

    corpoAgenda.innerHTML = '';
    const dataSelecionada = seletorData.value;
    const maquinaSelecionadaTexto = seletorMaquina.value || "LMP";
    const idMaquinaSelecionada = maquinaSelecionadaTexto.split(' ')[0];

    mostrarInstrucoes();

    for (let hora = 7; hora <= 16; hora++) {
        const horarioFormatado = `${hora.toString().padStart(2, '0')}:00 - ${(hora + 1).toString().padStart(2, '0')}:00`;
        const chaveAtual = `${dataSelecionada}-${maquinaSelecionadaTexto}-${hora}`;
        
        let motivoBloqueio = "";
        const nomeReserva = reservasGlobais[chaveAtual];

        // Lógica de conflito de equipamentos
        let temDosagemNoHorario = false;
        let temOutraEstufaNoHorario = false;

        Object.keys(reservasGlobais).forEach(chaveExistente => {
            if (chaveExistente.startsWith(dataSelecionada) && chaveExistente.endsWith(`-${hora}`)) {
                const partes = chaveExistente.split('-');
                if (partes.length >= 4) {
                    const idExistente = partes[3].split(' ')[0];
                    if (maquinasPrioritarias.includes(idExistente)) temDosagemNoHorario = true;
                    if (maquinasEstufa.includes(idExistente) && !maquinasPrioritarias.includes(idExistente)) temOutraEstufaNoHorario = true;
                }
            }
        });

        if (nomeReserva) {
            motivoBloqueio = `Reservado: ${nomeReserva}`;
        } else if (maquinasPrioritarias.includes(idMaquinaSelecionada) && temOutraEstufaNoHorario) {
            motivoBloqueio = "Bloqueado (Estufa ocupada)";
        } else if (["4", "8", "9", "13"].includes(idMaquinaSelecionada) && temDosagemNoHorario) {
            motivoBloqueio = "Prioridade: Dosagem";
        }

        const estaMarcado = selecoesTemporarias.has(chaveAtual) ? 'checked' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horarioFormatado}</td>
            <td class="${motivoBloqueio ? 'ocupado' : 'status-disponivel'}">${motivoBloqueio || 'Disponível'}</td>
            <td>${motivoBloqueio ? '---' : `<input type="checkbox" value="${chaveAtual}" ${estaMarcado} onchange="gerenciarSelecao(this)">`}</td>
        `;
        corpoAgenda.appendChild(tr);
    }
}

function gerenciarSelecao(checkbox) {
    checkbox.checked ? selecoesTemporarias.add(checkbox.value) : selecoesTemporarias.delete(checkbox.value);
}

async function reservarSelecionados() {
    const campos = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        orientador: document.getElementById('orientador').value,
        senha: document.getElementById('senha-lab').value
    };

    if (!campos.senha || !campos.nome) return alert("Preencha o nome e a senha!");
    if (selecoesTemporarias.size === 0) return alert("Selecione um horário!");

    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    btn.innerText = "Gravando na Planilha...";
    btn.disabled = true;

    // AQUI ESTÁ A CORREÇÃO: Gerar o ID antes do envio
    const ID_UNICO = "ID-" + Date.now();
    const dataUso = seletorData.value;
    const maquina = seletorMaquina.value;

    try {
        // 1. Envia para a planilha com o ID
        await fetch(URL_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                action: 'reservar_lote', 
                id: ID_UNICO, // ENVIANDO O ID PARA A PLANILHA
                senha: campos.senha,
                usuario: campos,
                reservas: Array.from(selecoesTemporarias).map(chave => ({ chave, maquina: maquina })),
                data: dataUso
            })
        });

        // 2. Monta a mensagem do WhatsApp COM O MESMO ID
        const horas = Array.from(selecoesTemporarias).map(ch => ch.split('-').pop() + ":00").sort().join(', ');
        
        let mensagem = `🔬 *Novo Agendamento LMP*\n\n`;
        mensagem += `*ID:* ${ID_UNICO}\n`;
        mensagem += `*Solicitante:* ${campos.nome}\n`;
        mensagem += `*Ensaio:* ${maquina}\n`;
        mensagem += `*Data:* ${dataUso}\n`;
        mensagem += `*Horários:* ${horas}\n\n`;
        mensagem += `✅ *ACEITAR:* \n${URL_API}?id=${ID_UNICO}&acao=Aceito\n\n`;
        mensagem += `❌ *RECUSAR:* \n${URL_API}?id=${ID_UNICO}&acao=Recusado`;

        alert("Dados gravados! Clique em OK para enviar ao responsável via WhatsApp.");
        
        window.open(`https://wa.me/5585988179510?text=${encodeURIComponent(mensagem)}`, '_blank');
        
        selecoesTemporarias.clear();
        carregarReservas();
    } catch (e) {
        alert("Erro ao conectar com o servidor.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Reservas";
    }
}

// Inicialização
if (seletorData) seletorData.addEventListener('change', atualizarAgenda);
if (seletorMaquina) seletorMaquina.addEventListener('change', atualizarAgenda);

configurarDataAtual();
carregarReservas();
