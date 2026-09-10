const state = {
  quizzes: [],
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
  quizList: document.querySelector('#quiz-list'),
  menuStatus: document.querySelector('#menu-status'),
  quizName: document.querySelector('#quiz-name'),
  counter: document.querySelector('#question-counter'),
  progress: document.querySelector('#progress-bar'),
  topic: document.querySelector('#question-topic'),
  question: document.querySelector('#question-text'),
  options: document.querySelector('#options'),
  feedback: document.querySelector('#feedback'),
  next: document.querySelector('#next-button'),
  total: document.querySelector('#result-total'),
  correct: document.querySelector('#result-correct'),
  wrong: document.querySelector('#result-wrong'),
  percent: document.querySelector('#result-percent'),
  topicResults: document.querySelector('#topic-results'),
  menuButton: document.querySelector('#menu-button')
};

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
    const quizzes = await fetchJson('indice.json');
    if (!Array.isArray(quizzes) || !quizzes.every(isValidQuizEntry)) {
      throw new Error('El índice no tiene el formato esperado.');
    }
    state.quizzes = quizzes;
    renderQuizList();
    elements.menuStatus.textContent = state.quizzes.length
      ? 'Selecciona un cuestionario para comenzar.'
      : 'No hay cuestionarios disponibles.';
  } catch (error) {
    state.quizzes = [];
    elements.quizList.replaceChildren();
    elements.menuStatus.textContent = 'No fue posible cargar el índice. Ejecuta la app con Live Server.';
    console.error(error);
  }
}

function renderQuizList() {
  elements.quizList.replaceChildren();
  state.quizzes.forEach((quiz) => {
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
}

async function startQuiz(quiz) {
  elements.menuStatus.textContent = `Cargando ${quiz.nombre}...`;
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
    elements.menuStatus.textContent = 'No fue posible cargar este cuestionario.';
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
    elements.feedback.textContent = question.explicacionAcierto;
  } else {
    selectedButton.classList.add('incorrect');
    elements.feedback.textContent = question.explicacionFallo;
    [...elements.options.children].find((button) => button.textContent === question.respuestaCorrecta)?.classList.add('correct');
  }
  state.topicStats[question.tema] = topic;
  [...elements.options.children].forEach((button) => { button.disabled = true; });
  elements.feedback.hidden = false;
  elements.next.hidden = false;
  elements.next.textContent = state.currentIndex === state.questions.length - 1 ? 'Ver resultados' : 'Siguiente';
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
  elements.menuStatus.textContent = state.quizzes.length
    ? 'Selecciona un cuestionario para comenzar.'
    : 'No hay cuestionarios disponibles.';
}

elements.next.addEventListener('click', showNextQuestion);
elements.menuButton.addEventListener('click', returnToMenu);

document.addEventListener('DOMContentLoaded', initializeApp);
