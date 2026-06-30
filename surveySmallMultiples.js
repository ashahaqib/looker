looker.plugins.visualizations.add({
  id: "survey_small_multiples",
  label: "Survey Small Multiples",

  options: {},

  create: function (element) {
    element.innerHTML = `
      <style>
        .survey-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          font-family: Arial, sans-serif;
          padding: 12px;
          align-items: start;
        }

        .survey-card {
          border: 1px solid #d9dde3;
          border-radius: 10px;
          padding: 14px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .survey-title {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.35;
          margin-bottom: 14px;
          color: #111827;
        }

        .bar-row {
          margin-bottom: 10px;
        }

        .bar-label {
          font-size: 12px;
          margin-bottom: 4px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bar-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bar-bg {
          flex: 1;
          height: 16px;
          background: #f3f4f6;
          border-radius: 8px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: #4f7cff;
          border-radius: 8px;
        }

        .bar-value {
          width: 48px;
          font-size: 12px;
          font-weight: 700;
          text-align: right;
          color: #111827;
          flex-shrink: 0;
        }

        .survey-empty {
          padding: 20px;
          font-size: 13px;
          color: #555;
        }

        @media (max-width: 1400px) {
          .survey-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1000px) {
          .survey-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .survey-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }
        }
      </style>

      <div class="survey-grid"></div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    const grid = element.querySelector(".survey-grid");
    grid.innerHTML = "";

    function equalizeCardHeights() {
      const cards = [...grid.querySelectorAll(".survey-card")];

      cards.forEach((card) => {
        card.style.height = "auto";
      });

      const rows = {};

      cards.forEach((card) => {
        const top = Math.round(card.offsetTop);
        if (!rows[top]) rows[top] = [];
        rows[top].push(card);
      });

      Object.values(rows).forEach((rowCards) => {
        const maxHeight = Math.max(...rowCards.map((card) => card.offsetHeight));
        rowCards.forEach((card) => {
          card.style.height = maxHeight + "px";
        });
      });
    }

    const dimensions = queryResponse.fields.dimensions || [];
    const measures = queryResponse.fields.measures || [];

    const questionField =
      dimensions.find((d) => d.name === "alchemer_self_serve.question") ||
      dimensions.find((d) => d.label_short === "Question") ||
      dimensions.find((d) => d.label && d.label.toLowerCase().includes("question"));

    const responseField =
      dimensions.find((d) => d.name === "alchemer_self_serve.response") ||
      dimensions.find((d) => d.label_short === "Response") ||
      dimensions.find((d) => d.label && d.label.toLowerCase().includes("response"));

    const measureField =
      measures.find((m) => m.name === "alchemer_self_serve.response_percent_by_question") ||
      measures.find((m) => m.label && m.label.toLowerCase().includes("response % by question")) ||
      measures[0];

    if (!questionField || !responseField || !measureField) {
      grid.innerHTML = `
        <div class="survey-empty">
          Select Question, Response, and Response % by Question. Do not pivot.
        </div>
      `;
      done();
      return;
    }

    const grouped = {};

    data.forEach((row) => {
      const question =
        row[questionField.name]?.rendered ||
        row[questionField.name]?.value ||
        "Unknown Question";

      const response =
        row[responseField.name]?.rendered ||
        row[responseField.name]?.value ||
        "Unknown Response";

      let value = row[measureField.name]?.value || 0;
      value = Number(value);

      if (value <= 1) value = value * 100;

      if (!grouped[question]) grouped[question] = [];
      grouped[question].push({ response, value });
    });

    Object.keys(grouped).forEach((question) => {
      grouped[question].sort((a, b) => b.value - a.value);

      const card = document.createElement("div");
      card.className = "survey-card";

      const title = document.createElement("div");
      title.className = "survey-title";
      title.textContent = question;
      card.appendChild(title);

      grouped[question].forEach((r) => {
        const row = document.createElement("div");
        row.className = "bar-row";

        const width = Math.max(0, Math.min(100, r.value));

        row.innerHTML = `
          <div class="bar-label" title="${r.response}">${r.response}</div>
          <div class="bar-wrap">
            <div class="bar-bg">
              <div class="bar-fill" style="width:${width}%"></div>
            </div>
            <div class="bar-value">${r.value.toFixed(1)}%</div>
          </div>
        `;

        card.appendChild(row);
      });

      grid.appendChild(card);
    });

    requestAnimationFrame(() => {
      equalizeCardHeights();
      done();
    });
  }
});
