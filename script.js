/**
 * SISTEMA DE AGENDAMENTO - LABORATÓRIO DE MISTURAS ASFÁLTICAS (LMP)
 * Endereço da Planilha de Destino: 
 * https://docs.google.com/spreadsheets/d/1o49JtvBfPkNFh703zXam5_9QD_qCQCxUtGD8-E5Uc_g/edit
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
const maquinasPrioritarias = ["1", "2"]; // Marshall e Superpave têm prioridade na estufa

// --- LIMITAÇÃO DE DATA (Máximo 2 semanas à frente) ---
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
    "1": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança, Compactador Marshall, Estufa, Misturador e Peneira.",
    "2": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança, Bomba de vácuo, Compactador Giratório, Estufa, Misturador e Peneira.",
    "3": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Extrator Centrifugo (Rotarex).",
    "4": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança e Estufa.",
    "5": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Quarteador.",
    "6": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Maquina Los Angeles e Peneiras.",
    "7": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Balança e recipientes.",
    "8": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Estufa e vidrarias.",
    "9": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Estufa e equipamento de tração.",
    "10": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Peneiras e agitador.",
    "11": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Paquímetro ou gabarito.",
    "12": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Solução de Sulfato e recipientes.",
    "13": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Estufa."
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
    textoInstrucoes.innerHTML = instrucao ? instrucao.replace("Equipamentos:", "<strong>Equipamentos:</strong>").replace(/\n/g, "<br>") : "Selecione um ensaio.";
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
        console.error("Erro na requisição:", e);
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">Erro ao carregar dados da planilha.</td></tr>';
    }
}

function atualizarAgenda() {
    if (!corpoAgenda) return;
    
    // --- BLOQUEIO DE FIM DE SEMANA ---
    const dataObj = new Date(seletorData.value + 'T00:00:00');
    const diaSemana = dataObj.getDay(); 
    if (diaSemana === 0 || diaSemana === 6) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:orange; text-align:center; font-weight:bold; padding: 20px;">⚠️ O laboratório não funciona aos sábados e domingos.</td></tr>';
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

        let temDosagemNoHorario = false;
        let temOutraEstufaNoHorario = false;

        Object.keys(reservasGlobais).forEach(chaveExistente => {
            if (chaveExistente.startsWith(dataSelecionada) && chaveExistente.endsWith(`-${hora}`)) {
                const partes = chaveExistente.split('-');
                if (partes.length >= 4) {
                    const idExistente = partes[3].split(' ')[0];
                    if (maquinasPrioritarias.includes(idExistente)) temDosagemNoHorario = true;
                    if (maquinasEstufa.includes(idExistente) && !maquinasPrioritarias.includes(idExistente)) {
                        temOutraEstufaNoHorario = true;
                    }
                }
            }
        });

        if (nomeReserva) {
            motivoBloqueio = `Reservado por: ${nomeReserva}`;
        } else if (maquinasPrioritarias.includes(idMaquinaSelecionada) && temOutraEstufaNoHorario) {
            motivoBloqueio = "Indisponível (Estufa em uso)";
        } else if (["4", "8", "9", "13"].includes(idMaquinaSelecionada) && temDosagemNoHorario) {
            motivoBloqueio = "Indisponível (Prioridade Dosagem)";
        }

        const estaMarcado = selecoesTemporarias.has(chaveAtual) ? 'checked' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horarioFormatado}</td>
            <td class="${motivoBloqueio ? 'ocupado' : 'status-disponivel'}">
                ${motivoBloqueio ? motivoBloqueio : 'Disponível'}
            </td>
            <td>
                ${motivoBloqueio ? '---' : `<input type="checkbox" class="chk-reserva" value="${chaveAtual}" ${estaMarcado} onchange="gerenciarSelecao(this)">`}
            </td>
        `;
        corpoAgenda.appendChild(tr);
    }
}

function gerenciarSelecao(checkbox) {
    checkbox.checked ? selecoesTemporarias.add(checkbox.value) : selecoesTemporarias.delete(checkbox.value);
    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    if (btn) btn.innerText = selecoesTemporarias.size > 0 ? `Confirmar ${selecoesTemporarias.size} reserva(s)` : "Confirmar Reservas Selecionadas";
}

async function reservarSelecionados() {
    const campos = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        orientador: document.getElementById('orientador').value,
        senha: document.getElementById('senha-lab').value
    };

    if (!campos.senha) return alert("Digite a senha do laboratório!");
    if (!campos.nome || !campos.email || !campos.orientador) return alert("Preencha todos os dados!");
    if (selecoesTemporarias.size === 0) return alert("Selecione pelo menos um horário!");

    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    btn.disabled = true;
    btn.innerText = "Processando...";

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'reservar_lote', 
                senha: campos.senha,
                usuario: { nome: campos.nome, email: campos.email, orientador: campos.orientador },
                reservas: Array.from(selecoesTemporarias).map(chave => ({ chave, maquina: seletorMaquina.value }))
            })
        });

        const resultado = await response.text();
        
        if (resultado.includes("Erro: Senha Incorreta")) {
            alert("Senha incorreta!");
            document.getElementById('senha-lab').value = "";
        } else if (resultado.startsWith("http")) { 
            alert("Solicitação registrada na planilha! Redirecionando ao WhatsApp do técnico...");
            window.location.href = resultado;
            selecoesTemporarias.clear();
            document.getElementById('senha-lab').value = "";
            carregarReservas();
        } else {
            alert("Solicitação processada com sucesso.");
            selecoesTemporarias.clear();
            document.getElementById('senha-lab').value = "";
            carregarReservas();
        }
    } catch (e) {
        alert("Erro ao conectar com o servidor da planilha.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Reservas Selecionadas";
    }
}

if (seletorData) seletorData.addEventListener('change', atualizarAgenda);
if (seletorMaquina) seletorMaquina.addEventListener('change', atualizarAgenda);

configurarDataAtual();
carregarReservas();
