const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0gzbJ20HxafSEhxAQ8N6dNSdJavFhv2zeipH-Oh6DPF8SQ_WXlGrPTXq8kVc4y5S2OQ/exec";

const modal = document.getElementById("lead-modal");
const openButtons = document.querySelectorAll("[data-open-modal]");
const closeButtons = document.querySelectorAll("[data-close-modal]");
const form = document.getElementById("lead-form");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("form-status");
const tabs = document.querySelectorAll(".unit-tab");
const panels = document.querySelectorAll(".unit-panel");
const renderedAtField = form.elements.renderedAt;
const recentSubmitKey = "medispark_recent_submit_phone";

renderedAtField.value = String(Date.now());

function openModal() {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

openButtons.forEach((button) => {
  button.addEventListener("click", openModal);
});

closeButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    tabs.forEach((item) => {
      item.classList.toggle("is-active", item === tab);
      item.setAttribute("aria-selected", String(item === tab));
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === target);
    });
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = form.name.value.trim();
  const phone = form.phone.value.replace(/\D/g, "");
  const interestType = form.interestType.value;
  const inquiry = form.inquiry.value.trim();
  const privacyConsent = form.privacyConsent.checked;
  const website = form.website.value.trim();
  const renderedAt = Number(form.renderedAt.value || 0);
  const elapsedMs = Date.now() - renderedAt;
  const url = new URL(window.location.href);
  const utmSource = url.searchParams.get("utm_source") || "";
  const utmMedium = url.searchParams.get("utm_medium") || "";
  const utmCampaign = url.searchParams.get("utm_campaign") || "";
  const utmContent = url.searchParams.get("utm_content") || "";
  const utmTerm = url.searchParams.get("utm_term") || "";
  const referrer = document.referrer || "";
  const landingPath = `${window.location.pathname}${window.location.search}`;
  const userAgent = navigator.userAgent;

  if (!name) {
    statusEl.textContent = "이름을 입력해주세요.";
    return;
  }

  if (phone.length < 10 || phone.length > 11) {
    statusEl.textContent = "연락처를 정확히 입력해주세요.";
    return;
  }

  if (!privacyConsent) {
    statusEl.textContent = "개인정보 동의 후 접수할 수 있습니다.";
    return;
  }

  if (website) {
    statusEl.textContent = "정상적인 접수만 가능합니다.";
    return;
  }

  if (elapsedMs < 2500) {
    statusEl.textContent = "입력 내용을 확인하신 뒤 다시 접수해주세요.";
    return;
  }

  const recentSubmit = window.sessionStorage.getItem(recentSubmitKey);
  if (recentSubmit && recentSubmit === phone) {
    statusEl.textContent = "동일 번호로 방금 접수되었습니다. 상담팀의 연락을 기다려주세요.";
    return;
  }

  const payload = {
    name,
    phone,
    interestType,
    inquiry,
    visitDateTime: "",
    privacyConsent,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    referrer,
    landingPath,
    userAgent,
    renderedAt,
    elapsedMs,
    honeypot: website,
    pageName: "메디스파크 랜딩페이지",
    projectName: "브레인시티 메디스파크 로제비앙 모아엘가",
    developer: "유정희",
    status: "신규접수"
  };

  submitBtn.disabled = true;
  statusEl.textContent = "접수 중입니다. 잠시만 기다려주세요.";

  try {
    let result;
    if (SCRIPT_URL.includes("YOUR_DEPLOYMENT_ID")) {
      console.log("[Local Mock Mode] Form submitted successfully. Payload:", payload);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      result = {
        ok: true,
        message: "접수가 완료되었습니다 (로컬 테스트 모드). 담당자가 확인 후 순차적으로 연락드립니다."
      };
    } else {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      result = await response.json();
    }

    if (!result.ok) {
      throw new Error(result.message || "상담 접수 처리 중 문제가 발생했습니다.");
    }

    statusEl.textContent = result.message || "접수가 완료되었습니다. 담당자가 확인 후 순차적으로 연락드립니다.";
    window.sessionStorage.setItem(recentSubmitKey, phone);
    form.reset();
    renderedAtField.value = String(Date.now());
    window.setTimeout(closeModal, 1200);
  } catch (error) {
    statusEl.textContent = error.message || "상담 접수 처리 중 문제가 발생했습니다.";
  } finally {
    submitBtn.disabled = false;
  }
});
