const URL_API = "https://script.google.com/macros/s/AKfycbwsrMhOXBzFDepqd50ipswFA-NDr6jdQBnqtJ5t86a3wFjGO4NeozqmsbB5rIwlcP8Q/exec";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina'); 
let reservasGlobais = {};
let selecoesTemporarias = new Set();

if (seletorData) {
    seletorData.min = new Date().toISOString().split("T")[0];
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
    "13": "Preferencialmente, colocar o material na estufa ao final do dia e retirar no começo da manhã do dia seguinte. \n\nEquipamentos: Estufa.",
    "14": "Seguir as instruções gerais apresentadas. \n\nEquipamentos: Estufa."
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
    corpoAgenda.innerHTML = '<tr><td colspan="3">Carregando horários...</td></tr>';
    
    try {
        console.log("Tentando buscar dados de:", URL_API);
        const response = await fetch(URL_API);
        
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const texto = await response.text();
        console.log("Resposta bruta do servidor:", texto);

        try {
            reservasGlobais = JSON.parse(texto);
            atualizarAgenda();
        } catch (jsonError) {
            console.error("Erro ao processar JSON:", jsonError);
            corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">O servidor não enviou um formato válido. Verifique a publicação do Script.</td></tr>';
        }
    } catch (e) {
        console.error("Erro na requisição:", e);
        corpoAgenda.innerHTML = '<tr><td colspan="3" style="color:red">Erro ao carregar dados. Verifique a conexão ou o console (F12).</td></tr>';
    }
}

function atualizarAgenda() {
    if (!corpoAgenda) return;
    corpoAgenda.innerHTML = '';
    const dataSelecionada = seletorData.value;
    const maquinaSelecionada = seletorMaquina.value || "LMP";

    mostrarInstrucoes();

    for (let hora = 7; hora <= 16; hora++) {
        const horarioFormatado = `${hora.toString().padStart(2, '0')}:00 - ${(hora + 1).toString().padStart(2, '0')}:00`;
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
                ${nomeReserva ? '---' : `<input type="checkbox" class="chk-reserva" value="${chaveReserva}" ${estaMarcado} onchange="gerenciarSelecao(this)">`}
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
            btn.disabled = false;
        } else {
            alert("Solicitação enviada com sucesso!");
            selecoesTemporarias.clear();
            document.getElementById('senha-lab').value = "";
            carregarReservas();
        }
    } catch (e) {
        alert("Erro no envio.");
        btn.disabled = false;
    }
}

if (seletorData) seletorData.addEventListener('change', atualizarAgenda);
if (seletorMaquina) seletorMaquina.addEventListener('change', atualizarAgenda);

configurarDataAtual();
carregarReservas();
