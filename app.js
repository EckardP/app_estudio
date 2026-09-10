const state = {
  materias: [],
  selectedMateria: null,
  questions: [],
  currentIndex: 0,
  correct: 0,
  answered: false,
  topicStats: {}
};

state.quizName = '';

const views = {
  menu: document.querySelector('#menu'),
  game: document.querySelector('#juego'),
  results: document.querySelector('#resultados')
};

const elements = {
  materiasMenu: document.querySelector('#menu-materias'),
  cuestionariosMenu: document.querySelector('#menu-cuestionarios'),
  materiaList: document.querySelector('#materia-list'),
  materiaName: document.querySelector('#materia-name'),
  quizList: document.querySelector('#quiz-list'),
  menuStatus: document.querySelector('#menu-status'),
  quizStatus: document.querySelector('#quiz-status'),
  quizName: document.querySelector('#quiz-name'),
  counter: document.querySelector('#question-counter'),
  progress: document.querySelector('#progress-bar'),
  topic: document.querySelector('#question-topic'),
  question: document.querySelector('#question-text'),
  options: document.querySelector('#options'),
  feedback: document.querySelector('#feedback'),
  feedbackText: document.querySelector('#feedback-text'),
  next: document.querySelector('#next-button'),
  total: document.querySelector('#result-total'),
  correct: document.querySelector('#result-correct'),
  wrong: document.querySelector('#result-wrong'),
  percent: document.querySelector('#result-percent'),
  topicResults: document.querySelector('#topic-results'),
  menuButton: document.querySelector('#menu-button')
};

const materiasButton = document.querySelector('#materias-button');

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = secureRandomIndex(index + 1);
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function secureRandomIndex(maximum) {
  const randomValue = new Uint32Array(1);
  const range = 0x100000000;
  const limit = Math.floor(range / maximum) * maximum;

  do {
    crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= limit);

  return randomValue[0] % maximum;
}

function isValidQuizEntry(quiz) {
  return quiz && typeof quiz.nombre === 'string' && typeof quiz.archivo === 'string';
}

function isValidMateria(materia) {
  return materia
    && typeof materia.materia === 'string'
    && Array.isArray(materia.cuestionarios)
    && materia.cuestionarios.every(isValidQuizEntry);
}

function isValidQuestion(question) {
  return question
    && typeof question.pregunta === 'string'
    && typeof question.tema === 'string'
    && Array.isArray(question.opciones)
    && question.opciones.length > 1
    && question.opciones.every((option) => typeof option === 'string')
    && typeof question.respuestaCorrecta === 'string'
    && question.opciones.includes(question.respuestaCorrecta)
    && typeof question.explicacionAcierto === 'string'
    && typeof question.explicacionFallo === 'string';
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo leer ${url} (${response.status})`);
  return response.json();
}

function showView(viewName) {
  Object.values(views).forEach((view) => { view.hidden = true; });
  views[viewName].hidden = false;
}

async function initializeApp() {
  try {
    const materias = await fetchJson('indice.json');
    if (!Array.isArray(materias) || !materias.every(isValidMateria)) {
      throw new Error('El índice no tiene el formato esperado.');
    }
    state.materias = materias;
    renderMaterias();
    elements.menuStatus.textContent = state.materias.length
      ? 'Selecciona una materia para ver sus cuestionarios.'
      : 'No hay materias disponibles.';
  } catch (error) {
    state.materias = [];
    elements.materiaList.replaceChildren();
    elements.quizList.replaceChildren();
    elements.menuStatus.textContent = 'No fue posible cargar el índice. Ejecuta la app con Live Server.';
    console.error(error);
  }
}

function renderMaterias() {
  elements.materiaList.replaceChildren();
  state.materias.forEach((materia, index) => {
    const button = document.createElement('button');
    const accent = getSubjectStyle(materia.materia, index, materia.icono);
    const icon = document.createElement('i');
    const title = document.createElement('h2');
    const meta = document.createElement('div');
    const count = document.createElement('span');
    const detail = document.createElement('span');
    const action = document.createElement('span');
    button.className = 'materia-card';
    button.type = 'button';
    button.style.setProperty('--accent', accent.color);
    icon.className = `subject-icon bx ${accent.icon}`;
    icon.setAttribute('aria-hidden', 'true');
    title.textContent = materia.materia;
    meta.className = 'card-meta';
    count.textContent = `${materia.cuestionarios.length} ${materia.cuestionarios.length === 1 ? 'cuestionario' : 'cuestionarios'}`;
    detail.textContent = 'Practica a tu ritmo';
    meta.append(count, detail);
    action.className = 'card-action';
    action.innerHTML = 'Empezar <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>';
    button.append(icon, title, meta, action);
    button.addEventListener('click', () => seleccionarMateria(index));
    elements.materiaList.append(button);
  });
}

function getSubjectStyle(name, index, customIcon) {
  const normalized = name.toLocaleLowerCase('es');
  if (customIcon) return { icon: customIcon, color: '#a68cff' };
  if (normalized.includes('sistema') || normalized.includes('inform')) return { icon: 'bx-chip', color: '#3ce3d2' };
  if (normalized.includes('lectura') || normalized.includes('lengua')) return { icon: 'bx-book-open', color: '#f36a9b' };
  if (normalized.includes('matem')) return { icon: 'bx-math', color: '#69e58d' };
  if (normalized.includes('ciencia')) return { icon: 'bx-atom', color: '#65a8ff' };
  if (normalized.includes('ingl')) return { icon: 'bx-world', color: '#ff6e78' };
  if (normalized.includes('arte')) return { icon: 'bx-palette', color: '#ffd166' };
  const fallback = [{ icon: 'bx-book-open', color: '#f36a9b' }, { icon: 'bx-atom', color: '#65a8ff' }, { icon: 'bx-brain', color: '#ffd166' }];
  return fallback[index % fallback.length];
}

function seleccionarMateria(indiceMateria) {
  const materia = state.materias[indiceMateria];
  if (!materia) return;

  state.selectedMateria = materia;
  elements.materiaName.textContent = materia.materia;
  elements.quizList.replaceChildren();
  materia.cuestionarios.forEach((quiz) => {
    const button = document.createElement('button');
    const label = document.createElement('span');
    const arrow = document.createElement('span');
    button.className = 'quiz-button';
    button.type = 'button';
    label.textContent = quiz.nombre;
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(label, arrow);
    button.addEventListener('click', () => startQuiz(quiz));
    elements.quizList.append(button);
  });
  elements.quizStatus.textContent = materia.cuestionarios.length
    ? 'Selecciona un cuestionario para comenzar.'
    : 'No hay cuestionarios disponibles para esta materia.';
  elements.materiasMenu.hidden = true;
  elements.cuestionariosMenu.hidden = false;
}

async function startQuiz(quiz) {
  elements.quizStatus.textContent = `Cargando ${quiz.nombre}...`;
  try {
    const questions = await fetchJson(quiz.archivo);
    if (!Array.isArray(questions) || !questions.length || !questions.every(isValidQuestion)) {
      throw new Error('El cuestionario no tiene preguntas válidas.');
    }
    state.questions = shuffle(questions).map((question) => ({
      ...question,
      opciones: shuffle(question.opciones)
    }));
    state.currentIndex = 0;
    state.correct = 0;
    state.answered = false;
    state.topicStats = {};
    state.quizName = quiz.nombre;
    elements.quizName.textContent = quiz.nombre;
    showView('game');
    renderQuestion();
  } catch (error) {
    elements.quizStatus.textContent = 'No fue posible cargar este cuestionario.';
    console.error(error);
  }
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  state.answered = false;
  elements.counter.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  elements.progress.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
  elements.topic.textContent = question.tema;
  elements.question.textContent = question.pregunta;
  elements.options.replaceChildren();
  elements.feedback.hidden = true;
  elements.next.hidden = true;

  question.opciones.forEach((option) => {
    const button = document.createElement('button');
    button.className = 'option-button';
    button.type = 'button';
    button.textContent = option;
    button.addEventListener('click', () => answerQuestion(option, button));
    elements.options.append(button);
  });
}

function answerQuestion(selectedOption, selectedButton) {
  if (state.answered) return;
  state.answered = true;
  const question = state.questions[state.currentIndex];
  const isCorrect = selectedOption === question.respuestaCorrecta;
  const topic = state.topicStats[question.tema] || { correct: 0, total: 0 };
  topic.total += 1;
  if (isCorrect) {
    state.correct += 1;
    topic.correct += 1;
    selectedButton.classList.add('correct');
    elements.feedbackText.textContent = question.explicacionAcierto;
  } else {
    selectedButton.classList.add('incorrect');
    elements.feedbackText.textContent = question.explicacionFallo;
    [...elements.options.children].find((button) => button.textContent === question.respuestaCorrecta)?.classList.add('correct');
  }
  state.topicStats[question.tema] = topic;
  [...elements.options.children].forEach((button) => { button.disabled = true; });
  elements.feedback.hidden = false;
  elements.next.hidden = false;
  elements.next.innerHTML = state.currentIndex === state.questions.length - 1
    ? 'Ver resultados <i class="bx bx-bar-chart-alt-2" aria-hidden="true"></i>'
    : 'Siguiente <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>';
}

function showNextQuestion() {
  if (!state.answered) return;
  if (state.currentIndex === state.questions.length - 1) {
    renderResults();
    return;
  }
  state.currentIndex += 1;
  renderQuestion();
}

function renderResults() {
  const total = state.questions.length;
  const wrong = total - state.correct;
  const percentage = total ? Math.round((state.correct / total) * 100) : 0;
  elements.total.textContent = total;
  elements.correct.textContent = state.correct;
  elements.wrong.textContent = wrong;
  elements.percent.textContent = `${percentage}%`;
  elements.topicResults.replaceChildren();

  Object.entries(state.topicStats)
    .map(([name, stats]) => ({
      name,
      ...stats,
      percentage: Math.round((stats.correct / stats.total) * 100)
    }))
    .sort((first, second) => first.percentage - second.percentage)
    .forEach(renderTopicResult);
  showView('results');
}

function renderTopicResult(topic) {
  const row = document.createElement('div');
  const details = document.createElement('div');
  const name = document.createElement('strong');
  const meter = document.createElement('div');
  const meterFill = document.createElement('span');
  const score = document.createElement('span');

  row.className = 'topic-row';
  name.textContent = topic.name;
  meter.className = 'topic-meter';
  meterFill.style.width = `${topic.percentage}%`;
  meter.append(meterFill);
  details.append(name, meter);
  score.className = 'topic-score';
  score.textContent = `${topic.percentage}%`;
  row.append(details, score);
  elements.topicResults.append(row);
}

function returnToMenu() {
  showView('menu');
  state.selectedMateria = null;
  elements.cuestionariosMenu.hidden = true;
  elements.materiasMenu.hidden = false;
  elements.menuStatus.textContent = state.materias.length
    ? 'Selecciona una materia para ver sus cuestionarios.'
    : 'No hay materias disponibles.';
}

elements.next.addEventListener('click', showNextQuestion);
elements.menuButton.addEventListener('click', returnToMenu);
materiasButton.addEventListener('click', returnToMenu);

document.addEventListener('DOMContentLoaded', initializeApp);
