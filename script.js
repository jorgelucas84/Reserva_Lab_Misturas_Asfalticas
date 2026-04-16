const URL_API = "https://script.google.com/macros/s/AKfycbx2i7ZcdLE4qyU9RDtIeWZj0bpNIf5Ol2ULlnpy2V3xZfdAVe4kmlApmCbW0DxLQw/exec";
const $ = id => document.getElementById(id); // Seletor curto
const corpoAgenda = $('corpo-agenda'), selData = $('data'), selMaq = $('maquina');
let reservasGlobais = {}, selecoesTemporarias = new Set();

const maqEstufa = ["1", "2", "4", "8", "9", "13"], maqPriv = ["1", "2"];

const instrucoesMaquinas = {
    "1": "Balança, Compactador Marshall, Estufa, Misturador e Peneira.",
    "2": "Balança, Bomba de vácuo, Compactador Giratório, Estufa, Misturador e Peneira.",
    "3": "Extrator Centrifugo (Rotarex).", "4": "Balança e Estufa.", "5": "Quarteador.",
    "6": "Maquina Los Angeles e Peneiras.", "7": "Balança e recipientes.", "8": "Estufa e vidrarias.",
    "9": "Estufa e equipamento de tração.", "10": "Peneiras e agitador.", "11": "Paquímetro ou gabarito.",
    "12": "Solução de Sulfato e recipientes.", "13": "Estufa."
};

// Configuração inicial de datas
if (selData) {
    const hoje = new Date(), max = new Date();
    max.setDate(hoje.getDate() + 14);
    selData.min = hoje.toISOString().split("T")[0];
    selData.max = max.toISOString().split("T")[0];
    selData.value = selData.min;
}

const mostrarInstrucoes = () => {
    const txt = $('texto-instrucoes'), id = selMaq.value.split(' ')[0];
    if (txt && id) txt.innerHTML = instrucoesMaquinas[id] ? `<strong>Equipamentos:</strong> ${instrucoesMaquinas[id]}` : "Selecione um ensaio.";
};

async function carregarReservas() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    try {
        const resp = await fetch(URL_API);
        reservasGlobais = await resp.json();
        atualizarAgenda();
    } catch (e) { corpoAgenda.innerHTML = '<tr><td colspan="3">Erro ao carregar.</td></tr>'; }
}

function atualizarAgenda() {
    if (!corpoAgenda) return;
    const dataVal = selData.value, dataObj = new Date(dataVal + 'T00:00:00');
    if ([0, 6].includes(dataObj.getDay())) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="text-align:center">⚠️ Selecione um dia útil.</td></tr>';
        return;
    }

    corpoAgenda.innerHTML = '';
    const maqTxt = selMaq.value || "LMP", idMaq = maqTxt.split(' ')[0];
    mostrarInstrucoes();

    for (let h = 7; h <= 16; h++) {
        const chave = `${dataVal}-${maqTxt}-${h}`, nomeRes = reservasGlobais[chave];
        let bloqueio = nomeRes ? `Reservado: ${nomeRes}` : "";

        if (!bloqueio) {
            const conflitos = Object.keys(reservasGlobais).filter(k => k.startsWith(dataVal) && k.endsWith(`-${h}`));
            const temDosagem = conflitos.some(k => maqPriv.includes(k.split('-')[3].split(' ')[0]));
            const temEstufa = conflitos.some(k => maqEstufa.includes(k.split('-')[3].split(' ')[0]) && !maqPriv.includes(k.split('-')[3].split(' ')[0]));

            if (maqPriv.includes(idMaq) && temEstufa) bloqueio = "Indisponível (Estufa em uso)";
            else if (["4", "8", "9", "13"].includes(idMaq) && temDosagem) bloqueio = "Indisponível (Prioridade Dosagem)";
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${h}:00 - ${h+1}:00</td><td class="${bloqueio ? 'ocupado' : 'status-disponivel'}">${bloqueio || 'Disponível'}</td>
                        <td>${bloqueio ? '---' : `<input type="checkbox" value="${chave}" ${selecoesTemporarias.has(chave)?'checked':''} onchange="gerenciar(this)">`}</td>`;
        corpoAgenda.appendChild(tr);
    }
}

function gerenciar(cb) {
    cb.checked ? selecoesTemporarias.add(cb.value) : selecoesTemporarias.delete(cb.value);
    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    if (btn) btn.innerText = selecoesTemporarias.size > 0 ? `Confirmar ${selecoesTemporarias.size} reserva(s)` : "Confirmar Reservas";
}

async function reservarSelecionados() {
    const inputs = { nome: $('nome').value, email: $('email').value, ori: $('orientador').value, s: $('senha-lab').value };
    if (!inputs.s || !inputs.nome || selecoesTemporarias.size === 0) return alert("Preencha os dados e selecione horários!");

    const btn = document.querySelector('button[onclick="reservarSelecionados()"]');
    btn.disabled = true; btn.innerText = "Processando...";

    try {
        const resp = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({ action: 'reservar_lote', senha: inputs.s, usuario: { nome: inputs.nome, email: inputs.email, orientador: inputs.ori }, 
            reservas: Array.from(selecoesTemporarias).map(chave => ({ chave, maquina: selMaq.value })) })
        });
        const res = await resp.text();
        if (res.includes("Erro")) alert("Senha incorreta!");
        else {
            if (res.startsWith("http")) window.location.href = res;
            else alert("Sucesso!");
            selecoesTemporarias.clear(); carregarReservas();
        }
    } catch (e) { alert("Erro no envio."); }
    finally { btn.disabled = false; btn.innerText = "Confirmar Reservas"; }
}

[selData, selMaq].forEach(s => s?.addEventListener('change', atualizarAgenda));
carregarReservas();
