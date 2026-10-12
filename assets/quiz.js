document.querySelectorAll('[data-quiz]').forEach((quiz) => {
  quiz.addEventListener('submit', (event) => {
    event.preventDefault();

    const selected = quiz.querySelector('input[type="radio"]:checked');
    const feedback = quiz.querySelector('[data-quiz-feedback]');

    if (!selected) {
      feedback.textContent = 'Choose an answer first.';
      feedback.dataset.state = 'incorrect';
      return;
    }

    const correct = selected.dataset.correct === 'true';
    feedback.textContent = selected.dataset.feedback;
    feedback.dataset.state = correct ? 'correct' : 'incorrect';
  });
});
