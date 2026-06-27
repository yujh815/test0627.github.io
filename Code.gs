const SPREADSHEET_ID = "1vgXKooTBB0v6NVQSax1ckuUEXJGz_ff3M5BbulXYx28";
const SHEET_NAME = "leads";
const MIN_ELAPSED_MS = 2500;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const TIMEZONE = "Asia/Seoul";
const SHEET_HEADERS = [
  "등록일시",
  "이름",
  "연락처",
  "관심타입",
  "문의내용",
  "방문희망일시",
  "개인정보동의여부",
  "유입페이지명",
  "프로젝트명",
  "개발자정보",
  "상담상태",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "landing_path",
  "user_agent"
];

function doGet() {
  return jsonResponse({
    ok: true,
    message: "Medispark lead API is running.",
    sheetName: SHEET_NAME
  });
}

function doPost(e) {
  try {
    const payload = getPayloadFromEvent(e);

    // Apps Script editor에서 doPost를 직접 실행하면 e가 비어 있으므로 안내 응답을 반환합니다.
    if (!payload || Object.keys(payload).length === 0) {
      return jsonResponse({
        ok: false,
        message: "전송 데이터가 없습니다. 웹페이지 폼에서 다시 접수해 주세요."
      });
    }

    const name = String(payload.name || "").trim();
    const phone = String(payload.phone || "").replace(/\D/g, "");
    const developer = String(payload.developer || "").trim();
    const interestType = String(payload.interestType || "").trim();
    const inquiry = String(payload.inquiry || "").trim();
    const visitDateTime = String(payload.visitDateTime || "").trim();
    const privacyConsent = payload.privacyConsent === true ? "TRUE" : "FALSE";
    const pageName = String(payload.pageName || "").trim();
    const projectName = String(payload.projectName || "").trim();
    const status = String(payload.status || "신규접수").trim();
    const utmSource = String(payload.utmSource || "").trim();
    const utmMedium = String(payload.utmMedium || "").trim();
    const utmCampaign = String(payload.utmCampaign || "").trim();
    const utmContent = String(payload.utmContent || "").trim();
    const utmTerm = String(payload.utmTerm || "").trim();
    const referrer = String(payload.referrer || "").trim();
    const landingPath = String(payload.landingPath || "").trim();
    const userAgent = String(payload.userAgent || "").trim();
    const honeypot = String(payload.honeypot || "").trim();
    const elapsedMs = Number(payload.elapsedMs || 0);

    if (!name) {
      return jsonResponse({ ok: false, message: "이름을 입력해 주세요." });
    }

    if (phone.length < 10 || phone.length > 11) {
      return jsonResponse({ ok: false, message: "연락처 형식이 올바르지 않습니다." });
    }

    if (!developer) {
      return jsonResponse({ ok: false, message: "개발자 정보가 누락되었습니다." });
    }

    if (privacyConsent !== "TRUE") {
      return jsonResponse({ ok: false, message: "개인정보 수집 및 이용 동의가 필요합니다." });
    }

    if (honeypot) {
      return jsonResponse({ ok: false, message: "비정상 요청이 차단되었습니다." });
    }

    if (elapsedMs && elapsedMs < MIN_ELAPSED_MS) {
      return jsonResponse({ ok: false, message: "입력 내용을 확인하신 뒤 다시 접수해 주세요." });
    }

    const spreadsheet = getSpreadsheet();
    const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);
    ensureHeaders(sheet);

    if (isRecentDuplicate(sheet, phone)) {
      return jsonResponse({
        ok: false,
        message: "동일 번호로 이미 접수되었습니다. 상담팀 연락을 잠시 기다려 주세요."
      });
    }

    const now = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
      now,
      name,
      phone,
      interestType,
      inquiry,
      visitDateTime,
      privacyConsent,
      pageName,
      projectName,
      developer,
      status,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      landingPath,
      userAgent
    ]);

    return jsonResponse({
      ok: true,
      message: "접수가 완료되었습니다. 상담팀 확인 후 순차적으로 연락드립니다."
    });
  } catch (error) {
    Logger.log(error && error.stack ? error.stack : error);
    return jsonResponse({
      ok: false,
      message: getReadableErrorMessage(error)
    });
  }
}

function getPayloadFromEvent(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("전송 데이터 형식이 올바르지 않습니다.");
  }
}

function getSpreadsheet() {
  const trimmedId = String(SPREADSHEET_ID || "").trim();

  if (trimmedId && trimmedId !== "YOUR_SPREADSHEET_ID") {
    return SpreadsheetApp.openById(trimmedId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }

  throw new Error(
    "Google Sheets 연결 설정이 완료되지 않았습니다. SPREADSHEET_ID를 입력하거나 시트에 바인딩된 Apps Script에서 실행해 주세요."
  );
}

function getOrCreateSheet(spreadsheet, sheetName) {
  const existing = spreadsheet.getSheetByName(sheetName);
  if (existing) {
    return existing;
  }

  return spreadsheet.insertSheet(sheetName);
}

function ensureHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, SHEET_HEADERS.length).getValues()[0];
  const isEmpty = firstRow.every((value) => !String(value || "").trim());

  if (isEmpty) {
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function isRecentDuplicate(sheet, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  const startRow = Math.max(2, lastRow - 49);
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 3).getValues();
  const now = Date.now();

  for (let i = values.length - 1; i >= 0; i -= 1) {
    const rowTimestamp = values[i][0];
    const rowPhone = String(values[i][2] || "").replace(/\D/g, "");

    if (rowPhone !== phone) {
      continue;
    }

    const savedTime = new Date(rowTimestamp).getTime();
    if (!Number.isNaN(savedTime) && now - savedTime < DUPLICATE_WINDOW_MS) {
      return true;
    }
  }

  return false;
}

function getReadableErrorMessage(error) {
  const message = error && error.message ? String(error.message) : "";

  if (!message) {
    return "데이터 처리 중 알 수 없는 문제가 발생했습니다.";
  }

  if (message.indexOf("Google Sheets 연결 설정이 완료되지 않았습니다.") !== -1) {
    return message;
  }

  if (message.indexOf("Unexpected error while getting the method or property openById") !== -1) {
    return "Google Sheets 접근 권한을 확인해 주세요.";
  }

  if (message.indexOf("Cannot call SpreadsheetApp.openById") !== -1) {
    return "Google Sheets ID를 다시 확인해 주세요.";
  }

  return message;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
