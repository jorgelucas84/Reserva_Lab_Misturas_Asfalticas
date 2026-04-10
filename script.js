const URL_API = "https://script.google.com/macros/s/AKfycbzMJgg01IRm5nvACN8ZisEKo6fjBVHoEqc50Xhbl3q2zLDnHK63oS_Pv7Tv_xqBKyeV/exec";

const corpoAgenda = document.getElementById('corpo-agenda');
const seletorData = document.getElementById('data');
const seletorMaquina = document.getElementById('maquina');
let reservasGlobais = {};
// Esta "sacola" guarda as chaves selecionadas de vários dias/máquinas
let selecoesTemporarias = new Set();

// Impede selecionar datas anteriores a hoje no calendário
document.getElementById('data').min = new Date().toISOString().split("T")[0];

function formatarInstrucao(texto) {
  return texto.replace(
    "Equipamentos:",
    "<strong>Equipamentos:</strong>"
  ).replace(/\n/g, "<br>");
}

const instrucoesMaquinas = {
    "1": "O(a) solicitante pela coleta deverá enviar e-mail para Jorge Lucas (jorgelucas@det.ufc.br) com cópia para Romulo (romulojacome@yahoo.com.br) e Annie (annie@det.ufc.br). Para acompanhamento do técnico na coleta e procedimentos administrativos junto à ASTEF será necessário que a requisição seja feita com um período mínimo de 10 dias de antecedência. Sugere-se que o(a) interessado(a) se informe se há sacos para a coleta e baldes para o posterior armazenamento com um período mínimo de 30 dias de antecedência."
        + "\n\nEquipamentos: Pá e Sacos.",
    "2": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Quarteador.",
    "3": "Manter fechada a porta onde o peneirador está localizado."
        + "\n\nEquipamentos: Balança, Peneirador e Peneiras.",
    "4": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Balança e Estufa.",
    "5": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Balança, Crivos circulares e Crivos redutores.",
    "6": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Estufa, Balança e Peneiras.",
    "7": "Iniciar o ensaio sexta-feira para finalizar na segunda-feira."
        + "\n\nEquipamentos: Bequer, Estufa e Peneira.",
    "8": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Agitador, Balança, Bequer, Estufa e Peneira.",
    "9": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Balança, Compactador Marshall, Estufa, Misturador e Peneira.",
    "10": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Balança, Bomba de vácuo, Compactador Giratório, Estufa, Misturador e Peneira.",
    "11": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Cilindro, Compactador e Estufa.",
    "12": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Balança, Estufa Peneira e Rotarex.",
    "13": "Preferencialmente, colocar o material na estufa ao final do dia e retirar no começo da minha do dia seguinte."
        + "\n\nEquipamentos: Estufa.",
    "14": "Seguir as instruções gerais apresentadas."
        + "\n\nEquipamentos: Estufa."
};

function configurarDataAtual() {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    document.getElementById('data').value = dataFormatada;
}

function mostrarInstrucoes() {
    const maquinaId = document.getElementById('maquina').value;
    const labelInstrucoes = document.getElementById('texto-instrucoes').innerHTML = formatarInstrucao(instrucoesMaquinas[maquinaId]);
    
    // Busca a instrução no objeto, ou usa um texto padrão se não encontrar
    labelInstrucoes.innerText = instrucoesMaquinas[maquinaId] || "Sem instruções específicas.";
}

configurarDataAtual();

async function carregarReservas() {
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
    corpoAgenda.innerHTML = '';
    const dataSelecionada = seletorData.value;
    const maquinaSelecionada = seletorMaquina.value;

    mostrarInstrucoes();

    for (let hora = 0; hora < 24; hora++) {
        const horarioFormatado = `${hora}:00 - ${hora + 1}:00`;
        const chaveReserva = `${dataSelecionada}-M${maquinaSelecionada}-${hora}`;
        const nomeReserva = reservasGlobais[chaveReserva];

        // Verifica se esta chave já está na nossa "sacola" de seleções
        const estaMarcado = selecoesTemporarias.has(chaveReserva) ? 'checked' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${horarioFormatado}</td>
            <td class="${nomeReserva ? 'ocupado' : 'disponivel'}">
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

// Função que adiciona ou remove da "sacola" ao clicar no checkbox
function gerenciarSelecao(checkbox) {
    if (checkbox.checked) {
        selecoesTemporarias.add(checkbox.value);
    } else {
        selecoesTemporarias.delete(checkbox.value);
    }
    
    // Opcional: Atualiza o texto do botão com a contagem
    const btn = document.getElementById('btn-confirmar');
    btn.innerText = selecoesTemporarias.size > 0 
        ? `Confirmar ${selecoesTemporarias.size} reserva(s)` 
        : "Confirmar Reservas Selecionadas";
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
    const seletor = document.getElementById('maquina'); // Referência ao select

    if (!senhaInformada)                return alert("Digite a senha do laboratório!");
    if (!nome || !email || !orientador) return alert("Preencha todos os dados!");
    if (selecoesTemporarias.size === 0) return alert("Selecione pelo menos um horário!");
    if (!validarEmail(email))           return alert("Insira um e-mail válido.");

    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;
    btn.innerText = "Processando...";

    // Criamos a lista de reservas capturando o nome exibido no HTML
    const listaReservas = Array.from(selecoesTemporarias).map(chave => {
        const partes = chave.split('-');
        const idMaquina = partes[3].replace('M', '');
        
        // Esta linha busca o texto (ex: "Impressora 3D 02 - Bambu Lab") baseado no value
        const nomeExibido = seletor.querySelector(`option[value="${idMaquina}"]`).text;

        return {
            chave: chave,
            data: `${partes[0]}-${partes[1]}-${partes[2]}`,
            maquina: nomeExibido // Agora enviamos o nome completo e correto
        };
    });

    try {
        const response = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'reservar_lote', 
                senha: senhaInformada,
                usuario: { nome, email, orientador }, // Isso garante que os dados cheguem ao e-mail
                reservas: listaReservas
            })
        });

        const resultado = await response.text();
        
        if (resultado.includes("Erro: Senha Incorreta")) {
            alert("Senha incorreta!");
        } else {
            alert("Reservas confirmadas com sucesso!");
            selecoesTemporarias.clear();
            document.getElementById('senha-lab').value = "";
            carregarReservas();
        }
    } catch (e) {
        alert("Erro na conexão.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Reservas Selecionadas";
    }
}

seletorData.addEventListener('change', atualizarAgenda);
seletorMaquina.addEventListener('change', atualizarAgenda);
carregarReservas();