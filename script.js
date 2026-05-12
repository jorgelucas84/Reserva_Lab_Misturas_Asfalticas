/**
 * FRONTEND COMPLETO - script.js
 */

const URL_API = "https://script.google.com/macros/s/AKfycbxL-6eyZAMikYpXPCfHHsxx1vR2_SLqSxDO3tOqHXPcXIYXMXQeffAa68bNxnsmpZj40Q/exec";

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
    // Pegamos os elementos diretamente para garantir a atualização
    const corpo = document.getElementById('corpo-agenda');
    const dataSel = document.getElementById('data').value;
    const maqSel = document.getElementById('maquina').value;

    if (!corpo || !dataSel || !maqSel) return;
    corpo.innerHTML = '';

    for (let hora = 7; hora <= 17; hora++) {
        const horaFormatada = hora.toString().padStart(2, '0') + ":00";
        // Chave técnica idêntica à salva na planilha (Coluna H)
        const chave = `${dataSel}-${maqSel}-${horaFormatada}`;
        
        const ocupadoPor = reservasGlobais[chave];
        const marcado = selecoesTemporarias.has(chave);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horaFormatada}</td>
            <td class="${ocupadoPor ? 'status-indisponivel' : 'status-disponivel'}">
                ${ocupadoPor ? 'Reservado por: ' + ocupadoPor : 'Disponível'}
            </td>
            <td>
                ${ocupadoPor ? '---' : `<input type="checkbox" name="selecionar-hora" ${marcado ? 'checked' : ''} value="${horaFormatada}" onchange="gerenciar(this, '${chave}')">`}
            </td>
        `;
        corpo.appendChild(tr);
    }
}

function gerenciar(cb, chaveCompleta) {
    // Usamos a chave técnica para o Set de seleções
    cb.checked ? selecoesTemporarias.add(chaveCompleta) : selecoesTemporarias.delete(chaveCompleta);
}

async function reservarSelecionados() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha-lab').value;
    const dataUso = document.getElementById('data').value;
    const detalhes = document.getElementById('maquina').value;

    if (!nome || !senha || selecoesTemporarias.size === 0) {
        return alert("Por favor, preencha o Nome, Senha e selecione pelo menos um horário.");
    }

    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;
    btn.innerText = "A gravar...";

    const ID_UNICO = "ID-" + Date.now();
    
    const payload = {
        action: 'reservar_lote',
        id: ID_UNICO,
        senha: senha,
        usuario: { nome, email },
        // Enviamos a chave técnica que contém data, máquina e hora
        reservas: Array.from(selecoesTemporarias).map(ch => ({ chave: ch, maquina: detalhes })),
        data: dataUso
    };

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        const respText = await response.text();

        if (respText.includes("Sucesso")) {
            alert("✅ Dados salvos com sucesso!");
            
            const horas = Array.from(selecoesTemporarias).map(ch => ch.split('-').pop()).sort().join(', ');
            let msg = `🔬 *Novo Agendamento LMP*\n\n`;
            msg += `*ID:* ${ID_UNICO}\n*Nome:* ${nome}\n*Ensaio:* ${detalhes}\n*Data:* ${dataUso}\n*Horas:* ${horas}\n\n`;
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
        btn.innerText = "Confirmar Agendamento";
    }
}

// Listeners para atualizar a tabela conforme seleção
document.getElementById('data').addEventListener('change', atualizarAgenda);
// O seletor de máquina no seu HTML alimenta o input hidden 'maquina'
// A função selecionarEnsaio já chama atualizarDadosFinais que deve disparar a agenda
