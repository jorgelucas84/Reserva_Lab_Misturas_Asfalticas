const URL_API = "https://script.google.com/macros/s/AKfycbzMJgg01IRm5nvACN8ZisEKo6fjBVHoEqc50Xhbl3q2zLDnHK63oS_Pv7Tv_xqBKyeV/exec";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina'); 
let reservasGlobais = {};
let selecoesTemporarias = new Set();

if (seletorData) {
    seletorData.min = new Date().toISOString().split("T")[0];
}

function formatarInstrucao(texto) {
    if (!texto) return "Selecione um ensaio para ver as instruções.";
    return texto.replace(
        "Equipamentos:",
        "<strong>Equipamentos:</strong>"
    ).replace(/\n/g, "<br>");
}

const instrucoesMaquinas = {
    "1": "O(a) solicitante pela coleta deverá enviar e-mail para Jorge Lucas (jorgelucas@det.ufc.br)... \n\nEquipamentos: Pá e Sacos.",
    "2": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Quarteador.",
    "3": "Manter fechada a porta onde o peneirador está localizado. \n\nEquipamentos: Balança, Peneirador e Peneiras.",
    "4": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança e Estufa.",
    "5": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança, Crivos circulares e Crivos redutores.",
    "6": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Estufa, Balança e Peneiras.",
    "7": "Iniciar o ensaio sexta-feira para finalizar na segunda-feira. \n\nEquipamentos: Bequer, Estufa e Peneira.",
    "8": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Agitador, Balança, Bequer, Estufa e Peneira.",
    "9": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança, Compactador Marshall, Estufa, Misturador e Peneira.",
    "10": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança, Bomba de vácuo, Compactador Giratório, Estufa, Misturador e Peneira.",
    "11": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Cilindro, Compactador e Estufa.",
    "12": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança, Estufa Peneira e Rotarex.",
    "13": "Preferencialmente, colocar o material na estufa ao final do dia e retirar no começo da minha do dia seguinte. \n\nEquipamentos: Estufa.",
    "14": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Estufa."
};

function configurarDataAtual() {
    if (seletorData && !seletorData.value) {
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        seletorData.value = dataFormatada;
    }
}

function mostrarInstrucoes() {
    const textoInstrucoes = document.getElementById('texto-instrucoes');
    if (!textoInstrucoes) return;

    const maquinaValor = seletorMaquina.value;
    const maquinaId = maquinaValor.split(' ')[0]; 
    
    const instrucao = instrucoesMaquinas[maquinaId];
    if (instrucao) {
        textoInstrucoes.innerHTML = formatarInstrucao(instrucao);
    }
}

configurarDataAtual();

async function carregarReservas() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '<tr><td colspan="3">Carregando horários...</td></tr>';
    try {
        const response = await fetch(URL_API);
        reservasGlobais = await response.json();
        atualizarAgenda();
    } catch (e) {
        corpoAgenda.innerHTML = '<tr><td colspan="3">Erro ao carregar dados.</td></tr>';
    }
}

function atualizarAgenda() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '';
    const dataSelecionada = seletorData.value;
    const maquinaSelecionada = seletorMaquina.value || "LMP";

    mostrarInstrucoes();

    for (let hora = 7; hora <= 16; hora++) {
        const inicio = hora.toString().padStart(2, '0') + ":00";
        const fim = (hora + 1).toString().padStart(2, '0') + ":00";
        const horarioFormatado = `${inicio} - ${fim}`;
        
        const chaveReserva = `${dataSelecionada}-${maquinaSelecionada}-${hora}`;
        const nomeReserva = reservasGlobais[chaveReserva];

        const estaMarcado = selecoesTemporarias.has(chaveReserva) ? 'checked' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horarioFormatado}</td>
            <td class="${nomeReserva ? 'ocupado' : 'status-disponivel'}">
                ${nomeReserva ? `Reservado por: ${nomeReserva}` : 'Disponível'}
            </td>
            <td>
                ${nomeReserva 
                    ? '---' 
                    : `<input type="checkbox" class="chk-reserva" value="${chaveReserva}" ${estaMarcado} onchange="gerenciarSelecao(this)">`
                }
            </td>
        `;
        corpoAgenda.appendChild(tr);
    }
}

function gerenciarSelecao(checkbox) {
    if (checkbox.checked) {
        selecoesTemporarias.add(checkbox.value);
    } else {
        selecoesTemporarias.delete(checkbox.value);
    }
    
    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    if (btn) {
        btn.innerText = selecoesTemporarias.size > 0 
            ? `Confirmar ${selecoesTemporarias.size} reserva(s)` 
            : "Confirmar Reservas Selecionadas";
    }
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

async function reservarSelecionados() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const orientador = document.getElementById('orientador').value;
    const senhaInformada = document.getElementById('senha-lab').value;

    if (!senhaInformada) return alert("Digite a senha do laboratório!");
    if (!nome || !email || !orientador) return alert("Preencha todos os dados!");
    if (selecoesTemporarias.size === 0) return alert("Selecione pelo menos um horário!");
    if (!validarEmail(email)) return alert("Insira um e-mail válido.");

    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    btn.disabled = true;
    btn.innerText = "Processando...";

    const listaReservas = Array.from(selecoesTemporarias).map(chave => {
        const partes = chave.split('-');
        return {
            chave: chave,
            data: `${partes[0]}-${partes[1]}-${partes[2]}`,
            maquina: seletorMaquina.value 
        };
    });

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            // Removido mode: 'no-cors' para permitir leitura da resposta do Google
            body: JSON.stringify({ 
                action: 'reservar_lote', 
                senha: senhaInformada,
                usuario: { nome, email, orientador },
                reservas: listaReservas
            })
        });

        const resultado = await response.text();
        
        if (resultado.includes("Erro: Senha Incorreta")) {
            alert("Senha incorreta!");
            btn.disabled = false;
            btn.innerText = "Confirmar Reservas Selecionadas";
        } else {
            alert("Solicitação enviada com sucesso! O Rômulo receberá a notificação no WhatsApp para aprovação.");
            selecoesTemporarias.clear();
            document.getElementById('senha-lab').value = "";
            carregarReservas();
        }
    } catch (e) {
        alert("Erro na conexão ou no envio da solicitação.");
        btn.disabled = false;
        btn.innerText = "Confirmar Reservas Selecionadas";
    }
}

if (seletorData) seletorData.addEventListener('change', atualizarAgenda);

window.atualizarAgendaExterno = atualizarAgenda;

carregarReservas();
