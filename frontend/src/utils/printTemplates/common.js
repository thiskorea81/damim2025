// 날짜 포맷
export const formatDate = (t) => {
    if (!t) return '';
    if (t?.toDate) {
      const d = t.toDate();
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
    const d = new Date(t);
    if (isNaN(d)) return t;
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };
  
  // 체크박스 헬퍼
  export const isChk = (val, target) => val === target ? '&#9745;' : '&#9744;';
  export const isChkBool = (condition) => condition ? '&#9745;' : '&#9744;';
  
  // 결재란 HTML 생성
  export const getSanctionHTML = (approvalLine) => {
    let header = '';
    let body = '';
    
    const lines = (approvalLine && approvalLine.length > 0) ? approvalLine : [
      { label: '담임', isFinal: false },
      { label: '부장', isFinal: false },
      { label: '교감', isFinal: false },
      { label: '교장', isFinal: true }
    ];
  
    lines.forEach((step) => {
      header += `<th class="sanction-role">${step.label}</th>`;
      const content = step.isFinal ? '<span class="proxy-mark">전결</span>' : '';
      body += `<td class="stamp-box">${content}</td>`;
    });
    
    return { header, body };
  };
  
  // 공통 CSS 스타일 (여기에 전체 스타일을 정의)
  export const getPrintStyles = () => `
    @page { size: A4; margin: 0; }
    body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; margin: 0; padding: 0; background: #52525b; }
    .page { background: white; width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto 10px; box-sizing: border-box; position: relative; page-break-after: always; }
    .page:last-child { page-break-after: auto; margin-bottom: 0; }
    
    /* 헤더 레이아웃 */
    .top-header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; width: 100%; }
    .main-title-left { 
      width: 55%; 
      font-family: "바탕", "Batang", serif;
      font-size: 30px; font-weight: bold; text-decoration: underline; margin: 0; 
      letter-spacing: 2px; text-underline-offset: 8px; text-align: center; 
    }
    .sub-title-left { font-size: 20px; font-weight: bold; margin-bottom: 10px; margin-top: 20px; }
    
    /* 결재란 */
    .sanction-wrapper { width: 45%; display: flex; justify-content: flex-end; }
    .sanction-table { border-collapse: collapse; font-size: 12px; text-align: center; }
    .sanction-table th, .sanction-table td { border: 1px solid black; padding: 0; vertical-align: middle; }
    .sanction-title { width: 25px; background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
    .sanction-role { width: 70px; height: 25px; font-weight: normal; }
    .stamp-box { height: 60px; width: 70px; text-align: center; }
    .proxy-mark { font-weight: bold; font-family: serif; letter-spacing: 2px; }
  
    /* 메인 테이블 */
    .main-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 10px; }
    .main-table th, .main-table td { border: 1px solid black; padding: 8px 10px; vertical-align: middle; }
    .main-table th { background-color: #f3f4f6 !important; text-align: center; font-weight: bold; -webkit-print-color-adjust: exact; }
    
    /* 체크박스 테이블 */
    .sub-header-cell { background-color: #f3f4f6 !important; text-align: center; font-weight: bold; border-right: 1px solid black; -webkit-print-color-adjust: exact; }
    .sub-header-cell-sm { background-color: #f3f4f6 !important; text-align: center; font-size: 12px; border-right: 1px solid black; border-bottom: 1px solid black; -webkit-print-color-adjust: exact; }
    .check-cell-box { text-align: center; font-size: 16px; border-right: 1px solid black; }
    .check-cell-box:last-child { border-right: none; }
  
    /* 서명 및 하단 */
    .signature-section { text-align: center; margin-top: 20px; }
    .declaration { font-size: 16px; margin-bottom: 20px; line-height: 1.6; }
    .date-center { font-size: 16px; margin-bottom: 20px; font-weight: bold; }
    .signatures { display: flex; justify-content: center; gap: 60px; }
    .sig-row { display: flex; align-items: center; font-size: 16px; margin-bottom: 5px; }
    .role { font-weight: bold; margin-right: 10px; }
    .name { font-weight: bold; text-decoration: underline; margin-right: 5px; font-size: 17px; }
    .sig-img-sm { height: 40px; margin-left: 5px; vertical-align: middle; }
    .school-master { font-size: 24px; font-weight: bold; margin-top: 30px; text-align: center; letter-spacing: 3px; }
    
    .footer-info { text-align: left; font-size: 12px; color: #555; line-height: 1.5; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 20px; }
    hr.divider { border: 0; border-top: 1px dashed #aaa; margin: 30px 0; }
    
    @media print { 
      body { background: none; } 
      .page { margin: 0; width: 100%; height: 100%; box-shadow: none; page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
    }
  `;