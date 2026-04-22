const URL_API = "SUA_URL_DO_GOOGLE_AQUI"; 

let reservasGlobais = {};
let selecoesTemporarias = new Set();

window.onload = () => {
    document.getElementById('data').valueAsDate = new Date();
    carregarReservas();
};

async function carregarReservas() {
    const corpo = document.getElementById('corpo-agenda');
    corpo.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    try {
        const res = await fetch(URL_API);
        reservasGlobais = await res.json();
        atualizarAgenda();
    } catch (e) {
        corpo.innerHTML = '<tr><td colspan="3">Erro ao conectar.</td></tr>';
    }
}

function selecionarEquipamento(nome, el) {
    document.getElementById('maquina').value = nome;
    document.querySelectorAll('.ensaio-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    atualizarAgenda();
}

function atualizarAgenda() {
    const corpo = document.getElementById('corpo-agenda');
    const data = document.getElementById('data').value;
    const maq = document.getElementById('maquina').value;
    corpo.innerHTML = '';

    for (let h = 7; h <= 17; h++) {
        const chave = `${data}-${maq}-${h}`;
        const ocupado = reservasGlobais[chave];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${h}:00</td>
            <td class="${ocupado ? 'ocupado' : 'disponivel'}">${ocupado ? 'Reservado' : 'Livre'}</td>
            <td>${ocupado ? '-' : `<input type="checkbox" onchange="gerenciar('${chave}', this.checked)">`}</td>
        `;
        corpo.appendChild(tr);
    }
}

function gerenciar(chave, checked) {
    checked ? selecoesTemporarias.add(chave) : selecoesTemporarias.delete(chave);
}

async function reservarSelecionados() {
    const btn = document.getElementById('btn-confirmar');
    const dados = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        senha: document.getElementById('senha-lab').value,
        data: document.getElementById('data').value,
        maquina: document.getElementById('maquina').value
    };

    if (!dados.nome || !dados.senha || selecoesTemporarias.size === 0) return alert("Preencha tudo!");

    btn.disabled = true;
    const ID = "LMP-" + Date.now();

    try {
        await fetch(URL_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ id: ID, ...dados, reservas: Array.from(selecoesTemporarias) })
        });

        const horas = Array.from(selecoesTemporarias).map(c => c.split('-').pop() + ":00").sort().join(', ');
        let msg = `🔬 *Novo Agendamento LMP*\n\n*Solicitante:* ${dados.nome}\n*Equipamento:* ${dados.maquina}\n*Data:* ${dados.data}\n*Horas:* ${horas}\n\n✅ *ACEITAR:* \n${URL_API}?id=${ID}&acao=Aceito`;

        window.open(`https://wa.me/5585988179510?text=${encodeURIComponent(msg)}`, '_blank');
        location.reload();
    } catch (e) {
        alert("Erro no servidor.");
        btn.disabled = false;
    }
}

document.getElementById('data').addEventListener('change', atualizarAgenda);
