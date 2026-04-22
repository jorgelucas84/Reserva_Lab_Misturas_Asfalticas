/**
 * FRONTEND COMPLETO - script.js
 */

const URL_API = "https://script.google.com/a/det.ufc.br/macros/s/AKfycbx2i7ZcdLE4qyU9RDtIeWZj0bpNIf5Ol2ULlnpy2V3xZfdAVe4kmlApmCbW0DxLQw/exec";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina'); 
let reservasGlobais = {};
let selecoesTemporarias = new Set();

async function carregarReservas() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '<tr><td colspan="3">A carregar horários...</td></tr>';
    try {
        const response = await fetch(URL_API);
        reservasGlobais = await response.json();
        atualizarAgenda();
    } catch (e) {
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">Erro na conexão.</td></tr>';
    }
}

function atualizarAgenda() {
    if (!corpoAgenda || !seletorData.value) return;
    corpoAgenda.innerHTML = '';
    const dataSel = seletorData.value;
    const maqSel = seletorMaquina.value;

    for (let hora = 7; hora <= 16; hora++) {
        const chave = `${dataSel}-${maqSel}-${hora}`;
        const ocupado = reservasGlobais[chave];
        const marcado = selecoesTemporarias.has(chave);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${hora}:00</td>
            <td class="${ocupado ? 'ocupado' : 'disponivel'}">${ocupado ? 'Reservado por: ' + ocupado : 'Disponível'}</td>
            <td>${ocupado ? '---' : `<input type="checkbox" ${marcado ? 'checked' : ''} value="${chave}" onchange="gerenciar(this)">`}</td>
        `;
        corpoAgenda.appendChild(tr);
    }
}

function gerenciar(cb) {
    cb.checked ? selecoesTemporarias.add(cb.value) : selecoesTemporarias.delete(cb.value);
}

async function reservarSelecionados() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha-lab').value;

    if (!nome || !senha || selecoesTemporarias.size === 0) {
        return alert("Por favor, preencha o Nome, Senha e selecione pelo menos um horário.");
    }

    const btn = document.querySelector('button');
    btn.disabled = true;
    btn.innerText = "A gravar...";

    const ID_UNICO = "ID-" + Date.now();
    const payload = {
        action: 'reservar_lote',
        id: ID_UNICO,
        senha: senha,
        usuario: { nome, email },
        reservas: Array.from(selecoesTemporarias).map(ch => ({ chave: ch, maquina: seletorMaquina.value })),
        data: seletorData.value
    };

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        const respText = await response.text();

        if (respText.includes("Sucesso")) {
            alert("✅ Dados salvos com sucesso!\nClique em OK para enviar a mensagem de aprovação.");
            
            const horas = Array.from(selecoesTemporarias).map(ch => ch.split('-').pop() + ":00").sort().join(', ');
            let msg = `🔬 *Novo Agendamento LMP*\n\n`;
            msg += `*ID:* ${ID_UNICO}\n*Nome:* ${nome}\n*Ensaio:* ${seletorMaquina.value}\n*Data:* ${seletorData.value}\n*Horas:* ${horas}\n\n`;
            msg += `✅ *ACEITAR:* \n${URL_API}?id=${ID_UNICO}&acao=Aceito\n\n`;
            msg += `❌ *RECUSAR:* \n${URL_API}?id=${ID_UNICO}&acao=Recusado`;

            window.open(`https://wa.me/5585988179510?text=${encodeURIComponent(msg)}`, '_blank');
            location.reload(); 
        } else {
            alert("❌ Erro: " + respText);
        }
    } catch (e) {
        alert("Erro técnico ao conectar ao servidor.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Reservas";
    }
}

seletorData.addEventListener('change', atualizarAgenda);
seletorMaquina.addEventListener('change', atualizarAgenda);
carregarReservas();
