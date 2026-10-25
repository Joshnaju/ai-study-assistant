import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const features = [
    {
      title: "My Documents",
      description: "Upload and manage your study materials.",
      icon: "bi-file-earmark-text",
      path: "/documents",
      color: "primary",
    },
    {
      title: "Chat with AI",
      description: "Ask questions and get answers from your documents.",
      icon: "bi-chat-dots",
      path: "/chat",
      color: "success",
    },
    {
      title: "Summarize",
      description: "Generate concise summaries of your study materials.",
      icon: "bi-journal-text",
      path: "/summary",
      color: "warning",
    },
    {
      title: "MCQ Generator",
      description: "Create practice questions to test your knowledge.",
      icon: "bi-patch-question",
      path: "/mcqs",
      color: "info",
    },
  ];

  return (
    <div className="container-fluid px-3 px-md-4 py-4">
      {/* Welcome section */}
      <div className="mb-4 text-center">
        <i
          className="bi bi-mortarboard-fill d-inline-block"
          style={{
            fontSize: "60px",
            color: "#2478F2",
            lineHeight: 1.2,
          }}
        ></i>
        <h3 className="fw-bold mb-2" style={{ color: "#142A40" }}>
          Welcome to Student AI Assistant
        </h3>
        <p className="text-secondary mb-0">
          Upload your study materials and get instant help with questions,
          summaries and practice questions
        </p>
      </div>

      {/* Feature cards */}
      <div className="row g-3 g-lg-4">
        {features.map((feature) => (
          <div className="col-12 col-sm-6 col-xl-3" key={feature.title}>
            <div
              className="card h-100 border rounded-3 shadow-sm"
              style={{
                borderColor: "#E4EAF2",
                cursor: "pointer",
                transition: "0.2s",
              }}
              role="button"
              tabIndex={0}
              onClick={() => navigate(feature.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(feature.path);
              }}
            >
              <div className="card-body p-4 text-center">
                <div
                  className={`d-flex align-items-center justify-content-center rounded-3 bg-${feature.color} bg-opacity-10 text-${feature.color} mb-3 mx-auto`}
                  style={{ width: "48px", height: "48px" }}
                >
                  <i className={`bi ${feature.icon} fs-4`}></i>
                </div>

                <h5 className="fw-semibold mb-2" style={{ color: "#142A40" }}>
                  {feature.title}
                </h5>

                <p className="text-secondary small mb-3">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Getting started section */}
      <div
        className="card border-0 rounded-3 mt-4"
        style={{ backgroundColor: "#EAF1FF" }}
      >
        <div className="card-body p-3 p-md-4">
          <h5 className="fw-semibold mb-2" style={{ color: "#142A40" }}>
            Learn smarter, every day
          </h5>
          <p className="text-secondary mb-0">
            Upload your documents, explore concepts through AI chat, create
            summaries, and practise with MCQs — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
