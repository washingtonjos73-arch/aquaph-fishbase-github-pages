
// AquaPH — dados demonstrativos. Confirme os parâmetros por espécie/linhagem antes de usar em decisões de manejo.
const fishByMode = {
  freshwater: [
    {id:'betta',common:'Betta',scientific:'Betta splendens',ph:[6.0,8.0],temp:'24–28 °C',size:'Até 6 cm',care:'Intermediário',alt:'Peixe betta'},
    {id:'guppy',common:'Guppy',scientific:'Poecilia reticulata',ph:[7.0,8.0],temp:'20–28 °C',size:'Até 5 cm',care:'Fácil',alt:'Peixe guppy'},
    {id:'tetra',common:'Tetra-neon',scientific:'Paracheirodon innesi',ph:[6.0,7.5],temp:'22–27 °C',size:'Até 4 cm',care:'Fácil',alt:'Tetra-neon'},
    {id:'corydoras',common:'Corydora',scientific:'Corydoras spp.',ph:[6.0,7.8],temp:'23–27 °C',size:'Até 7 cm*',care:'Intermediário',alt:'Corydora'},
    {id:'platy',common:'Plati',scientific:'Xiphophorus maculatus',ph:[7.0,8.2],temp:'20–26 °C',size:'Até 6 cm',care:'Fácil',alt:'Peixe plati'},
    {id:'molly',common:'Molinésia',scientific:'Poecilia sphenops',ph:[7.0,8.5],temp:'24–28 °C',size:'Até 10 cm',care:'Intermediário',alt:'Molinésia'}
  ],
  marine: [
    {id:'clownfish',common:'Peixe-palhaço',scientific:'Amphiprion ocellaris',ph:[8.0,8.4],temp:'24–27 °C',size:'Até 11 cm',care:'Intermediário',alt:'Peixe-palhaço'},
    {id:'royal-gramma',common:'Gramma-real',scientific:'Gramma loreto',ph:[8.0,8.4],temp:'24–27 °C',size:'Até 8 cm',care:'Intermediário',alt:'Gramma-real'},
    {id:'blue-tang',common:'Cirurgião-patela',scientific:'Paracanthurus hepatus',ph:[8.1,8.4],temp:'24–27 °C',size:'Até 30 cm',care:'Avançado',alt:'Cirurgião-patela'},
    {id:'firefish',common:'Firefish',scientific:'Nemateleotris magnifica',ph:[8.0,8.4],temp:'24–27 °C',size:'Até 9 cm',care:'Intermediário',alt:'Firefish'},
    {id:'chromis',common:'Chromis-verde',scientific:'Chromis viridis',ph:[8.0,8.4],temp:'24–28 °C',size:'Até 8 cm',care:'Fácil',alt:'Chromis-verde'},
    {id:'cardinalfish',common:'Cardinal-de-Banggai',scientific:'Pterapogon kauderni',ph:[8.0,8.4],temp:'24–28 °C',size:'Até 8 cm',care:'Intermediário',alt:'Cardinal-de-Banggai'}
  ]
};

let waterMode = 'freshwater';
let fishData = fishByMode[waterMode];
let fishbaseIndex = [];
const dataStatus = document.querySelector('#dataStatus');

let minPH = 5;
let maxPH = 9;
const stepPH = 0.1;

const phScale = document.querySelector('#phScale');
const thumb = document.querySelector('#scaleThumb');
const phRange = document.querySelector('#phRange');
const freshwaterModeButton = document.querySelector('#freshwaterMode');
const saltwaterModeButton = document.querySelector('#saltwaterMode');
const searchInput = document.querySelector('#searchInput');
const fishGrid = document.querySelector('#fishGrid');
const emptyState = document.querySelector('#emptyState');

let selectedPH = 7;
let searchTerm = '';

const formatPH = value => Number(value).toFixed(1).replace('.', ',');
const clampPH = value => Math.min(maxPH, Math.max(minPH, Math.round(Number(value) * 10) / 10));
const phPosition = value => ((value - minPH) / (maxPH - minPH)) * 100;

function buildTicks() {
  const container = document.querySelector('#scaleTicks');
  container.innerHTML = '';

  for (let value = Math.ceil(minPH * 2) / 2; value <= maxPH + 0.001; value += 0.5) {
    const tick = document.createElement('div');
    tick.className = 'scale-tick';

    const label = document.createElement('span');
    label.textContent = formatPH(value);

    tick.append(label);
    container.append(tick);
  }
}

function getPHState(value) {
  if (value < 6.8) {
    return {
      name: 'Levemente ácido',
      description: 'Condições mais ácidas',
      color: '#e5a17b'
    };
  }

  if (value <= 7.2) {
    return {
      name: 'Próximo do neutro',
      description: 'Equilíbrio entre acidez e alcalinidade',
      color: '#62e6ce'
    };
  }

  if (waterMode === 'marine') {
    return {
      name: 'Alcalino marinho',
      description: 'Faixa típica de aquários marinhos',
      color: '#79cfff'
    };
  }

  return {
    name: 'Levemente alcalino',
    description: 'Condições mais alcalinas',
    color: '#7da9f5'
  };
}

function updatePH(value) {
  selectedPH = clampPH(value);

  const position = phPosition(selectedPH);
  const state = getPHState(selectedPH);

  document.querySelector('#phValue').textContent = formatPH(selectedPH);
  document.querySelector('#thumbValue').textContent = formatPH(selectedPH);
  document.querySelector('#phDescription').textContent = state.description;
  document.querySelector('#phState').textContent = state.name;
  document.querySelector('#stateDot').style.background = state.color;
  document.querySelector('#stateDot').style.color = state.color;
  document.querySelector('.current-reading > span:first-child').style.color = state.color;

  thumb.style.left = `${position}%`;
  thumb.setAttribute('aria-valuenow', selectedPH);
  thumb.setAttribute('aria-label', `Valor de pH selecionado: ${formatPH(selectedPH)}`);

  phRange.value = selectedPH;

  document.querySelector('#resultDescription').textContent =
    `Espécies de ${waterMode === 'marine' ? 'água marinha' : 'água doce'} com faixa orientativa incluindo pH ${formatPH(selectedPH)}.`;

  document.querySelector('#scaleRangeLabel').textContent =
    `Intervalo: ${formatPH(minPH)} – ${formatPH(maxPH)}`;

  renderFish();
}

function setFromPointer(event) {
  const rect = phScale.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));

  updatePH(minPH + ratio * (maxPH - minPH));
}

// Busca de fotografias por nome científico na API do iNaturalist.
const fishPhotoCache = new Map();

async function findFishPhoto(fish) {
  const searchName = fish.scientific.includes(' spp.')
    ? fish.scientific.replace(' spp.', '')
    : fish.scientific;

  if (!fishPhotoCache.has(searchName)) {
    const request = (async () => {
      try {
        const params = new URLSearchParams({
          taxon_name: searchName,
          photos: 'true',
          quality_grade: 'research',
          per_page: '20',
          order_by: 'votes',
          order: 'desc'
        });

        const response = await fetch(
          `https://api.inaturalist.org/v1/observations?${params.toString()}`,
          { headers: { Accept: 'application/json' } }
        );

        if (!response.ok) {
          throw new Error(`iNaturalist HTTP ${response.status}`);
        }

        const payload = await response.json();

        const observation = (payload.results || []).find(item =>
          Array.isArray(item.photos) && item.photos.length > 0
        );

        if (!observation) return null;

        const photo = observation.photos[0];

        return {
          url: String(photo.url || '').replace('/square.', '/medium.'),
          attribution: photo.attribution || 'iNaturalist'
        };
      } catch (error) {
        console.warn(`Não foi possível buscar a foto de ${searchName}:`, error);
        return null;
      }
    })();

    fishPhotoCache.set(searchName, request);
  }

  return fishPhotoCache.get(searchName);
}

function renderFish() {
  const matches = fishData.filter(fish =>
    selectedPH >= fish.ph[0] &&
    selectedPH <= fish.ph[1] &&
    `${fish.common} ${fish.scientific} ${fish.apiCommon || ''}`.toLowerCase().includes(searchTerm)
  );

  fishGrid.innerHTML = '';
  emptyState.classList.toggle('hidden', matches.length !== 0);

  matches.forEach((fish, index) => {
    const card = document.createElement('article');
    card.className = 'fish-card';
    card.style.animationDelay = `${index * 65}ms`;

    card.innerHTML = `
      <div class="fish-photo-wrap">
        <img class="fish-photo"
          src="https://placehold.co/800x500/0b2634/9ee9d8?text=${encodeURIComponent(fish.common)}"
          alt="${fish.alt}" loading="lazy">
        <span class="compat-badge">✓ pH ${formatPH(fish.ph[0])}–${formatPH(fish.ph[1])}</span>
      </div>
      <div class="fish-body">
        <h3 class="fish-name"></h3>
        <p class="fish-scientific"></p>
        <div class="fish-stats">
          <div><span class="stat-label">TEMPERATURA</span><span class="stat-value"></span></div>
          <div><span class="stat-label">TAMANHO MÁX.</span><span class="stat-value"></span></div>
          <div><span class="stat-label">CUIDADO</span><span class="stat-value care-tag"></span></div>
          <div><span class="stat-label">FAIXA DE pH</span><span class="stat-value"></span></div>
        </div>
      </div>`;

    card.querySelector('.fish-name').textContent = fish.apiCommon || fish.common;
    card.querySelector('.fish-scientific').textContent = fish.scientific;

    const stats = card.querySelectorAll('.fish-stats .stat-value');

    [
      fish.temp,
      fish.size,
      fish.care,
      `${formatPH(fish.ph[0])}–${formatPH(fish.ph[1])}`
    ].forEach((value, i) => {
      stats[i].textContent = value;
    });

    const image = card.querySelector('img');

    image.addEventListener('error', () => {
      image.src = `https://placehold.co/800x500/0b2634/9ee9d8?text=${encodeURIComponent(fish.common)}`;
    }, { once: true });

    fishGrid.append(card);

    // Atualiza a foto quando a consulta terminar, desde que o card ainda exista.
    findFishPhoto(fish).then(photo => {
      if (!image.isConnected) return;

      if (photo && photo.url) {
        image.src = photo.url;
        image.alt = `Foto de ${fish.common} (${fish.scientific})`;
        image.title = `Crédito da fotografia: ${photo.attribution}`;
      }
    });
  });
}

phScale.addEventListener('click', setFromPointer);

phScale.addEventListener('pointerdown', event => {
  if (event.target === thumb) return;

  phScale.setPointerCapture?.(event.pointerId);
  setFromPointer(event);
});

phScale.addEventListener('pointermove', event => {
  if (event.buttons === 1 || event.pointerType === 'touch') {
    setFromPointer(event);
  }
});

thumb.addEventListener('keydown', event => {
  let next = selectedPH;

  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    next += stepPH;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    next -= stepPH;
  } else if (event.key === 'Home') {
    next = minPH;
  } else if (event.key === 'End') {
    next = maxPH;
  } else {
    return;
  }

  event.preventDefault();
  updatePH(next);
});

phRange.addEventListener('input', event => updatePH(event.target.value));

searchInput.addEventListener('input', event => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderFish();
});

function setWaterMode(mode) {
  if (mode === waterMode) return;

  waterMode = mode;
  fishData = fishByMode[mode];

  document.body.dataset.waterMode = mode;

  const marine = mode === 'marine';

  freshwaterModeButton.classList.toggle('is-active', !marine);
  saltwaterModeButton.classList.toggle('is-active', marine);

  freshwaterModeButton.setAttribute('aria-pressed', String(!marine));
  saltwaterModeButton.setAttribute('aria-pressed', String(marine));

  document.querySelector('#speciesEyebrow').textContent =
    marine ? 'ESPÉCIES DE ÁGUA MARINHA' : 'ESPÉCIES DE ÁGUA DOCE';

  document.querySelector('#heroSubtitle').textContent = marine
    ? 'Explore o pH do seu aquário marinho e descubra espécies de recife com parâmetros compatíveis.'
    : 'Explore a escala, descubra espécies de água doce compatíveis e crie um ambiente onde a vida aquática prospera.';

  document.querySelector('#aboutDescription').textContent = marine
    ? 'Selecione o pH medido no aquário marinho. Os resultados são referências iniciais; salinidade, alcalinidade, cálcio, temperatura e compatibilidade entre espécies também importam.'
    : 'Escolha o pH medido no seu aquário de água doce. A lista mostra espécies cuja faixa orientativa inclui esse valor. Confirme os parâmetros por espécie e linhagem.';

  minPH = 5;
  maxPH = 9;

  phRange.min = minPH;
  phRange.max = maxPH;
  phRange.step = stepPH;

  thumb.setAttribute('aria-valuemin', minPH);
  thumb.setAttribute('aria-valuemax', maxPH);

  document.querySelector('.scale-endpoints span:first-child').textContent = formatPH(minPH);
  document.querySelector('.scale-endpoints span:last-child').textContent = formatPH(maxPH);

  document.querySelector('#phScale').setAttribute(
    'aria-label',
    `Selecione o pH para aquário de ${marine ? 'água marinha' : 'água doce'}`
  );

  buildTicks();
  updatePH(marine ? 8.2 : 7.0);
}

freshwaterModeButton.addEventListener('click', () => setWaterMode('freshwater'));
saltwaterModeButton.addEventListener('click', () => setWaterMode('marine'));

// Índice científico FishBase/SeaLifeBase.
async function loadFishBaseIndex() {
  if (!dataStatus) return;

  try {
    const response = await fetch('data/fishbase-index.json', { cache: 'no-cache' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    fishbaseIndex = Array.isArray(payload.species) ? payload.species : [];

    const index = new Map(
      fishbaseIndex.map(item => [
        String(item.scientificName || '').trim().toLowerCase(),
        item
      ])
    );

    Object.values(fishByMode).flat().forEach(fish => {
      const match = index.get(fish.scientific.toLowerCase());

      if (match && match.commonName) {
        fish.apiCommon = match.commonName;
      }

      fish.fishbaseMatch = Boolean(match);
    });

    dataStatus.textContent =
      `Nomes científicos verificados com índice FishBase/SeaLifeBase (${Number(payload.count || fishbaseIndex.length).toLocaleString('pt-BR')} registros). As faixas de pH são referências orientativas do AquaPH.`;

    renderFish();
  } catch (error) {
    console.warn('Índice FishBase/SeaLifeBase indisponível:', error);

    dataStatus.textContent =
      'Índice científico indisponível no momento; exibindo a lista local. A régua de pH continua funcionando.';
  }
}

document.querySelector('#year').textContent = new Date().getFullYear();

buildTicks();
updatePH(7);
loadFishBaseIndex();

// Imagem do banner conforme o modo selecionado.
const heroFish = document.querySelector('#heroFish');
const freshwaterMode = document.querySelector('#freshwaterMode');
const saltwaterMode = document.querySelector('#saltwaterMode');

if (heroFish && freshwaterMode && saltwaterMode) {
  const freshwaterImage = 'img/peixes-para-aquario-de-agua-doce-1.jpg';
  const saltwaterImage = 'img/peixe-marinho.jpg';

  function updateHeroFish(isSaltwater) {
    heroFish.src = isSaltwater ? saltwaterImage : freshwaterImage;
    heroFish.alt = isSaltwater
      ? 'Peixe de aquário marinho'
      : 'Peixe tropical de água doce';
  }

  freshwaterMode.addEventListener('click', () => updateHeroFish(false));
  saltwaterMode.addEventListener('click', () => updateHeroFish(true));
}
