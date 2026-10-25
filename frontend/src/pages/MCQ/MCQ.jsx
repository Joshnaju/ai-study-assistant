import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  CircleHelp,
  FileText,
  LoaderCircle,
  RotateCcw,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import "./MCQ.css";
import { getDocuments } from "../../services/documentService";
import { generateMCQ } from "../../services/mcqService";

function MCQ() {
  const [documents, setDocuments] = useState([]);
  const [documentId, setDocumentId] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await getDocuments();
      const data = Array.isArray(response)
        ? response
        : response.results || response.documents || [];

      setDocuments(data.filter((doc) => doc.is_indexed === true));
    } catch (err) {
      setError(err.response?.detail || "Failed to load documents.");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const generateMCQs = async () => {
    if (!documentId) {
      setError("Please select a document.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await generateMCQ(documentId, questionCount);

      const generated = response.questions;

      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error("No questions were generated.");
      }

      setQuestions(generated);
      setSuccess(`${generated.length} questions generated successfully.`);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message ||
          "Failed to generate MCQs.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const getOptions = (options) => {
    if (Array.isArray(options)) {
      return options.map((option, index) => [
        String.fromCharCode(65 + index),
        typeof option === "string" ? option : option.text,
      ]);
    }

    return Object.entries(options || {});
  };

  const getCorrectAnswer = (question) =>
    question.correct_answer || question.answer;

  const score = questions.reduce((total, question, index) => {
    return total + (answers[index] === getCorrectAnswer(question) ? 1 : 0);
  }, 0);

  const submitAnswers = () => {
    if (Object.keys(answers).length !== questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setError("");
    setSubmitted(true);
  };

  const resetQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setError("");
    setSuccess("");
  };

  return (
    <div className="container-fluid py-4">
      {/* Page heading */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3">
          <BookOpen size={26} />
        </div>

        <div>
          <h3 className="fw-bold mb-1">Practice MCQs</h3>
          <p className="text-muted mb-0">
            Test your knowledge using your study documents.
          </p>
        </div>
      </div>

      {/* Document and question selection */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="fw-semibold mb-4">
            <FileText size={19} className="me-2 text-primary" />
            Choose your study material
          </h5>

          <div className="row g-3">
            <div className="col-md-8">
              <label htmlFor="mcq-document" className="form-label fw-semibold">
                Select document
              </label>

              <select
                id="mcq-document"
                className="form-select"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                disabled={loadingDocuments || generating}
              >
                <option value="">
                  {loadingDocuments
                    ? "Loading documents..."
                    : "Select a document"}
                </option>

                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title || doc.name || doc.filename}
                  </option>
                ))}
              </select>

              {!loadingDocuments && documents.length === 0 && (
                <small className="text-muted d-block mt-2">
                  No indexed documents available. Upload a document first.
                </small>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="mcq-count" className="form-label fw-semibold">
                Number of questions
              </label>

              <select
                id="mcq-count"
                className="form-select"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                disabled={generating}
              >
                <option value="5">5 questions</option>
                <option value="10">10 questions</option>
                <option value="15">15 questions</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary mt-4"
            onClick={generateMCQs}
            disabled={!documentId || loadingDocuments || generating}
          >
            {generating ? (
              <>
                <LoaderCircle size={18} className="me-2 mcq-spin" />
                Generating...
              </>
            ) : (
              <>
                <CircleHelp size={18} className="me-2" />
                Generate MCQs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            className="btn-close ms-3"
            aria-label="Close"
            onClick={() => setError("")}
          />
        </div>
      )}

      {success && !submitted && (
        <div
          className="alert alert-success alert-dismissible fade show d-flex justify-content-between align-items-center"
          role="status"
        >
          <span>{success}</span>

          <button
            type="button"
            className="btn-close ms-3"
            aria-label="Close"
            onClick={() => setSuccess("")}
          />
        </div>
      )}

      {/* Final score */}
      {submitted && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body text-center p-4">
            <Trophy size={35} className="text-warning mb-2" />

            <h4 className="fw-bold">Quiz completed!</h4>

            <h2 className="text-primary fw-bold my-3">
              {score}{" "}
              <span className="text-muted fs-5">/ {questions.length}</span>
            </h2>

            <p className="text-muted">
              You answered {score} out of {questions.length} questions
              correctly.
            </p>

            <div className="progress mb-3" style={{ height: "8px" }}>
              <div
                className="progress-bar"
                style={{
                  width: `${(score / questions.length) * 100}%`,
                }}
              />
            </div>

            <button
              className="btn btn-outline-primary"
              onClick={generateMCQs}
              disabled={generating}
            >
              <RotateCcw size={17} className="me-2" />
              Generate new questions
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <div className="mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h4 className="fw-bold mb-1">Quiz questions</h4>
              <p className="text-muted mb-0">
                {submitted
                  ? "Review your answers and explanations."
                  : "Select one answer for each question."}
              </p>
            </div>

            <span className="badge bg-primary rounded-pill px-3 py-2">
              {Object.keys(answers).length}/{questions.length} answered
            </span>
          </div>

          {questions.map((question, index) => {
            const correctAnswer = getCorrectAnswer(question);
            const options = getOptions(question.options);
            const selectedAnswer = answers[index];

            return (
              <div className="card border-0 shadow-sm mb-3" key={index}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="badge bg-primary bg-opacity-10 text-primary">
                      Question {index + 1}
                    </span>

                    {submitted &&
                      (selectedAnswer === correctAnswer ? (
                        <span className="text-success small fw-semibold">
                          <CheckCircle size={16} className="me-1" />
                          Correct
                        </span>
                      ) : (
                        <span className="text-danger small fw-semibold">
                          <XCircle size={16} className="me-1" />
                          Incorrect
                        </span>
                      ))}
                  </div>

                  <h5 className="fw-semibold mb-4">{question.question}</h5>

                  <div className="d-grid gap-2">
                    {options.map(([key, value]) => {
                      const isSelected = selectedAnswer === key;
                      const isCorrect = correctAnswer === key;

                      let optionStyle = "border rounded-3 p-3";

                      if (submitted && isCorrect) {
                        optionStyle +=
                          " border-success bg-success bg-opacity-10";
                      } else if (submitted && isSelected) {
                        optionStyle += " border-danger bg-danger bg-opacity-10";
                      } else if (isSelected) {
                        optionStyle +=
                          " border-primary bg-primary bg-opacity-10";
                      }

                      return (
                        <label
                          key={key}
                          className={`d-flex align-items-center gap-3 ${optionStyle}`}
                          style={{
                            cursor: submitted ? "default" : "pointer",
                          }}
                        >
                          <input
                            className="form-check-input mt-0 flex-shrink-0"
                            type="radio"
                            name={`question-${index}`}
                            value={key}
                            checked={isSelected}
                            disabled={submitted}
                            onChange={() =>
                              setAnswers((previous) => ({
                                ...previous,
                                [index]: key,
                              }))
                            }
                          />

                          <span className="fw-semibold">{key}.</span>
                          <span>{value}</span>
                        </label>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="alert alert-light border mt-3 mb-0">
                      <strong>
                        {selectedAnswer === correctAnswer
                          ? "Well done!"
                          : `Correct answer: ${correctAnswer}`}
                      </strong>

                      {question.explanation && (
                        <p className="text-muted mb-0 mt-2">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!submitted ? (
            <button className="btn btn-primary" onClick={submitAnswers}>
              <Send size={17} className="me-2" />
              Submit answers
            </button>
          ) : (
            <button className="btn btn-outline-secondary" onClick={resetQuiz}>
              <RotateCcw size={17} className="me-2" />
              Start again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MCQ;
