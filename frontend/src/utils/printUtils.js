import { getPrintStyles } from './printTemplates/common';
import { getAbsenceFormHTML } from './printTemplates/absenceForm';
import { getTripAppHTML, getTripNotificationHTML } from './printTemplates/tripApplication';
import { getTripReportHTML } from './printTemplates/tripReport';

/**
 * [신규] PDF 저장용 파일명 생성 함수
 * 형식: 문서제목(10901 홍길동)
 */
const generateFileName = (doc) => {
  // 학생 정보 추출 (없을 경우 빈 문자열)
  const grade = doc.grade || doc.student?.grade || '';
  // 반과 번호는 2자리로 패딩 (9반 -> 09, 1번 -> 01) => 10901
  const classNum = String(doc.classNum || doc.class || doc.student?.classNum || '').padStart(2, '0');
  const number = String(doc.number || doc.student?.number || '').padStart(2, '0');
  const name = doc.name || doc.studentName || doc.student?.name || '';
  
  const studentInfo = `${grade}${classNum}${number} ${name}`;

  // 문서 타입별 제목 설정
  let title = doc.type;
  if (doc.type === '체험학습') {
    title = '교외체험학습신청서및통보서';
  } else if (doc.type === '결과보고서') {
    title = '교외체험학습보고서';
  } else if (doc.type === '결석신고서') {
    title = '결석신고서';
  }

  return `${title}(${studentInfo})`;
};

/**
 * 문서 인쇄 메인 함수
 * @param {Object} doc - 문서 데이터
 * @param {Object} teacherData - 담임교사 정보
 * @param {Array} approvalLine - 결재선 설정
 */
export const printDocument = (doc, teacherData, approvalLine) => {
  let contentHTML = '';

  // 1. 문서 타입별 HTML 생성
  if (doc.type === '결석신고서') {
    contentHTML = getAbsenceFormHTML(doc, teacherData, approvalLine);
  } 
  else if (doc.type === '체험학습') {
    // 1페이지: 신청서, 2페이지: 통보서
    contentHTML = getTripAppHTML(doc, teacherData, approvalLine) + getTripNotificationHTML(doc, teacherData);
  } 
  else if (doc.type === '결과보고서') {
    contentHTML = getTripReportHTML(doc, teacherData, approvalLine);
  }

  // 2. 파일명 생성
  const fileName = generateFileName(doc);

  // 3. 윈도우 팝업 및 출력
  const win = window.open('', '_blank', 'width=900,height=1200');
  
  // 4. 전체 HTML 조립 (CSS + Body)
  // [중요] <title> 태그에 fileName을 넣어주면 PDF 저장 시 파일명이 됩니다.
  win.document.write(`
    <html>
      <head>
        <title>${fileName}</title>
        <style>
          ${getPrintStyles()}
        </style>
      </head>
      <body>
        ${contentHTML}
        <script>
          window.onload = function() { 
            // 로딩 시간 고려하여 약간의 지연 후 인쇄 창 호출
            setTimeout(() => { window.print(); }, 500); 
          }
        </script>
      </body>
    </html>
  `);
  
  win.document.close();
};