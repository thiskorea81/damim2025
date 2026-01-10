import { formatDate, getSanctionHTML, isChk, isChkBool } from './common';

export const getAbsenceFormHTML = (doc, teacherData, approvalLine) => {
  const dateStr = formatDate(doc.submittedAt || doc.createdAt);
  const procDateStr = formatDate(doc.processedAt || new Date());
  const sanction = getSanctionHTML(approvalLine);
  
  const teacherName = doc.teacherName || teacherData.name;
  const teacherSign = doc.teacherSignature ? `<img src="${doc.teacherSignature}" class="sig-img-sm"/>` : '(인)';
  const methodDetail = doc.teacherCheck?.method === '기타' ? `(${doc.teacherCheck.methodDetail})` : '';

  const type = doc.absenceType || '';
  const isDisease = type === '질병결석';
  const isMenstrual = type === '인정결석(생리통)';
  const isOther = type === '기타결석';
  const isEvent = type === '경조사'; 
  const isService = type === '사회봉사';
  const isInfection = type === '법정감염병';

  const start = doc.period?.start || doc.startDate || '';
  const end = doc.period?.end || doc.endDate || '';
  const days = doc.period?.days || doc.days || '';

  return `
    <div class="page">
      <div class="top-header-area">
        <h1 class="main-title-left">결 석 신 고 서</h1>
        <div class="sanction-wrapper">
          <table class="sanction-table">
            <tbody>
              <tr><th rowspan="2" class="sanction-title">결<br>재</th>${sanction.header}</tr>
              <tr>${sanction.body}</tr>
            </tbody>
          </table>
        </div>
      </div>

      <table class="main-table">
        <colgroup><col width="15%"><col width="35%"><col width="15%"><col width="35%"></colgroup>
        <tbody>
          <tr>
            <th>학년 / 반</th><td>${doc.grade}학년 ${doc.classNum || doc.class}반 ${doc.number}번</td>
            <th>성 명</th><td>${doc.name || doc.studentName}</td>
          </tr>
          <tr>
            <th>결석 기간</th>
            <td colspan="3">
              ${start} ~ ${end} (총 ${days}일간)<br>
              ${doc.period?.startPeriod ? `(${doc.period.startPeriod}교시 ~ ${doc.period.endPeriod}교시)` : ''}
            </td>
          </tr>
          
          <tr>
            <th style="padding:0; vertical-align:middle;">유 형<br><span style="font-size:11px; font-weight:normal;">(해당란 V표)</span></th>
            <td colspan="3" style="padding:0;">
              <table style="width:100%; height:100%; border-collapse:collapse; border:none; margin:0;">
                <colgroup>
                   <col width="16.66%"><col width="16.66%"><col width="16.66%"><col width="16.66%"><col width="16.66%"><col width="16.66%">
                </colgroup>
                <tr>
                  <td rowspan="2" class="sub-header-cell" style="border-top:0; border-bottom:0; border-left:0;">질병</td>
                  <td rowspan="2" class="sub-header-cell" style="border-top:0; border-bottom:0;">기타</td>
                  <td colspan="4" class="sub-header-cell" style="border-top:0; border-right:0; border-bottom:1px solid black;">출석인정</td>
                </tr>
                <tr>
                  <td class="sub-header-cell-sm" style="border-bottom:1px solid black;">경조사</td>
                  <td class="sub-header-cell-sm" style="border-bottom:1px solid black;">사회봉사<br>특별교육</td>
                  <td class="sub-header-cell-sm" style="border-bottom:1px solid black;">법정<br>감염병</td>
                  <td class="sub-header-cell-sm" style="border-bottom:1px solid black; border-right:0;">기타<br>(생리 등)</td>
                </tr>
                <tr style="height:40px;">
                  <td class="check-cell-box" style="border-bottom:0; border-left:0;">${isChkBool(isDisease)}</td>
                  <td class="check-cell-box" style="border-bottom:0;">${isChkBool(isOther)}</td>
                  <td class="check-cell-box" style="border-bottom:0;">${isChkBool(isEvent)}</td>
                  <td class="check-cell-box" style="border-bottom:0;">${isChkBool(isService)}</td>
                  <td class="check-cell-box" style="border-bottom:0;">${isChkBool(isInfection)}</td>
                  <td class="check-cell-box" style="border-bottom:0; border-right:0;">${isChkBool(isMenstrual)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <th class="h-24">사 유 및<br>학부모 의견</th>
            <td colspan="3" class="align-top py-2" style="line-height:1.6;">
              <strong>[사유]</strong> ${doc.reason}<br><br>
              <strong>[학부모 의견]</strong> ${doc.parentOpinion || '(없음)'}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="signature-section">
        <div class="declaration">
          상기 본인은 위와 같은 사유로 (${doc.absenceDetail || '결석'}) 하였기에<br>
          증빙서류와 함께 보호자 연서로 확인서를 제출합니다.
        </div>
        <div class="date-center" style="margin-bottom:20px;">${dateStr}</div>
        <div class="signatures">
          <div class="sig-row"><span class="role">학 생 :</span><span class="name">${doc.name || doc.studentName}</span>${doc.signatures?.studentSig ? `<img src="${doc.signatures.studentSig}" class="sig-img-sm"/>`:'(인)'}</div>
          <div class="sig-row"><span class="role">보호자 :</span><span class="name">${doc.signatures?.parentName || ''}</span>${doc.signatures?.parentSig ? `<img src="${doc.signatures.parentSig}" class="sig-img-sm"/>`:'(인)'}</div>
        </div>
      </div>

      <hr class="divider"/>

      <h1 class="sub-title-left">『담임확인서』</h1>
      <table class="main-table">
        <colgroup><col width="20%"><col width="80%"></colgroup>
        <tbody>
          <tr>
            <th>담임확인 및<br>증빙 서류</th>
            <td>
              <div class="check-row mb-2">
                <span class="check-item">${isChk(doc.teacherCheck?.method, '통화')} 보호자와 통화 확인</span>
                <span class="check-item">${isChk(doc.teacherCheck?.method, '면담')} 보호자 면담</span>
                <span class="check-item">${isChk(doc.teacherCheck?.method, '기타')} 기타 ${methodDetail}</span>
              </div>
              <div class="check-grid-2">
                <span>${isChk(doc.teacherCheck?.proofType, '병원진료영수증')} 병원진료영수증</span>
                <span>${isChk(doc.teacherCheck?.proofType, '투약봉지')} 투약봉지</span>
                <span>${isChk(doc.teacherCheck?.proofType, '병원처방전')} 병원처방전</span>
                <span>${isChk(doc.teacherCheck?.proofType, '의료기관 진단서/소견서')} 의료기관의 진단서(소견서)</span>
                <span>${isChk(doc.teacherCheck?.proofType, 'PCR 결과 통보서')} PCR 결과 통보서</span>
                <span>${isChk(doc.teacherCheck?.proofType, '증빙서류 없음')} 증빙서류 없음</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="signature-section" style="margin-top:30px;">
        <div class="declaration" style="font-weight:normal;">"해당 학생이 위와 같은 사유로 (${doc.absenceDetail || '결석'}) 하였음을 확인합니다."</div>
        <div class="date-center" style="margin-top:10px; margin-bottom:20px;">${procDateStr}</div>
        <div class="signatures" style="justify-content:flex-end;">
          <div class="sig-row"><span class="role">담임교사 :</span><span class="name">${teacherName}</span>${teacherSign}</div>
        </div>
        <div class="school-master">상당고등학교장 귀하</div>
      </div>
    </div>
  `;
};