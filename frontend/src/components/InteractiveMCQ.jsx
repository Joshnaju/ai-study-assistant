import { useState } from "react";

function InteractiveMCQ({ questions = [] }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!questions.length) return null;

  const score = questions.reduce((total, question, index) => {
    return total + (answers[index] === question.correct_answer ? 1 : 0);
  }, 0);

  const handleSubmit = () => {
    if (Object.keys(answers).length !== questions.length) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="card mt-3 mb-3">
      <div className="card-header bg-body-tertiary">
        <h5 className="mb-1">Practice MCQs</h5>
        <small className="text-secondary">
          Select one answer for each question.
        </small>
      </div>

      <div className="card-body">
        {submitted && (
          <div className="alert alert-info">
            <strong>
              Your score: {score} / {questions.length}
            </strong>
          </div>
        )}

        {questions.map((question, index) => {
          const selectedAnswer = answers[index];
          const isCorrect = selectedAnswer === question.correct_answer;

          return (
            <div key={index} className="border rounded p-3 mb-3">
              <h6 className="fw-bold mb-3">
                {index + 1}. {question.question}
              </h6>

              {Object.entries(question.options || {}).map(([key, value]) => {
                const selected = selectedAnswer === key;
                const correct = submitted && key === question.correct_answer;
                const incorrect = submitted && selected && !isCorrect;

                let optionClass = "border rounded p-2 mb-2";

                if (correct) {
                  optionClass += " border-success bg-success-subtle";
                } else if (incorrect) {
                  optionClass += " border-danger bg-danger-subtle";
                }

                return (
                  <label
                    key={key}
                    className={`${optionClass} d-flex align-items-start gap-2`}
                    style={{
                      cursor: submitted ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      className="form-check-input mt-1"
                      name={`mcq-${index}`}
                      value={key}
                      checked={selected}
                      disabled={submitted}
                      onChange={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [index]: key,
                        }))
                      }
                    />

                    <span>
                      <strong>{key}.</strong> {value}
                    </span>
                  </label>
                );
              })}

              {submitted && (
                <div className="mt-3">
                  <p
                    className={
                      isCorrect
                        ? "text-success fw-semibold mb-1"
                        : "text-danger fw-semibold mb-1"
                    }
                  >
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </p>

                  {!isCorrect && (
                    <p className="small mb-1">
                      <strong>Correct answer:</strong> {question.correct_answer}
                    </p>
                  )}

                  {question.explanation && (
                    <p className="small text-secondary mb-0">
                      {question.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!submitted ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={Object.keys(answers).length !== questions.length}
            onClick={handleSubmit}
          >
            Submit answers
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleReset}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export default InteractiveMCQ;
