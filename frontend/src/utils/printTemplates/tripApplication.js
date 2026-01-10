import { formatDate } from './common';

// [양식 2] 체험학습 신청서 HTML (결재란 삭제)
export const getTripAppHTML = (doc, teacherData) => {
  // 결재란 로직 제거
  const dateStr = formatDate(doc.createdAt);
  
  const s = doc.student || {};
  const p = doc.period || {};
  const pl = doc.plan || {};
  const g = doc.guardian || {};

  // 서명 데이터 확인
  const studentSigData = s.studentSignImage || s.studentSign || doc.studentSign;
  const parentSigData = g.parentSignImage || g.parentSign || doc.parentSign;

  return `
    <div class="page">
      <div class="top-header-area" style="justify-content: center; margin-bottom: 40px;">
        <h1 class="main-title-left" style="width: 100%; text-align: center; font-size:32px;">교외체험학습 신청서</h1>
      </div>

      <table class="main-table">
        <colgroup><col width="15%"><col width="35%"><col width="15%"><col width="35%"></colgroup>
        <tbody>
          <tr>
            <th>성 명</th><td>${s.name || doc.name}</td>
            <th>학년/반/번</th><td>${s.grade || doc.grade}학년 ${s.classNum || doc.classNum}반 ${s.number || doc.number}번</td>
          </tr>
          <tr>
            <th>기 간</th>
            <td colspan="3">${p.startDate || doc.startDate} ~ ${p.endDate || doc.endDate} (총 ${p.totalDays || doc.totalDays}일간)</td>
          </tr>
          <tr>
            <th>장 소</th>
            <td colspan="3">${pl.location || doc.location}</td>
          </tr>
          <tr>
            <th>학습계획</th>
            <td colspan="3" style="height: 250px; vertical-align: top;">
              <div style="margin-bottom:8px;"><strong>[학습 형태]</strong> ${pl.typeDetail || pl.type || doc.learningType || ''}</div>
              <strong>[상세 내용]</strong><br>
              ${pl.detail || doc.reason || '(내용 없음)'}
            </td>
          </tr>
          <tr>
            <th>동반자</th>
            <td colspan="3">
              보호자: ${g.parentName || doc.chaperone || ''} (${g.parentRel || ''}) <br>
              인솔자 연락처: ${g.guidePhone || g.parentPhone || ''}
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="signature-section" style="margin-top: 50px;">
        <div class="declaration">
          위와 같이 교외체험학습을 신청하오니 허가하여 주시기 바랍니다.
        </div>
        <div class="date-center" style="margin-top: 40px;">${dateStr}</div>
        <div class="signatures" style="flex-direction: column; align-items: center; gap: 15px;">
          <div class="sig-row"><span class="role">신청인(학생) :</span><span class="name">${s.name || doc.name}</span>
            ${studentSigData ? `<img src="${studentSigData}" class="sig-img-sm"/>` : '(서명)'}
          </div>
          <div class="sig-row"><span class="role">보호자 :</span><span class="name">${g.parentName || ''}</span>
            ${parentSigData ? `<img src="${parentSigData}" class="sig-img-sm"/>` : '(서명)'}
          </div>
        </div>
        <div class="school-master" style="margin-top: 60px;">상당고등학교장 귀하</div>
      </div>
    </div>
  `;
};

// [양식 3] 체험학습 통보서 HTML (결재란 없음 - 기존 유지)
export const getTripNotificationHTML = (doc, teacherData) => {
  const s = doc.student || {};
  const p = doc.period || {};
  const pl = doc.plan || {};
  const todayStr = formatDate(new Date());
  const teacherName = teacherData.name;
  const teacherSigData = doc.teacherSignature; 
  
  return `
    <div class="page">
      <div style="height: 50px;"></div>
      <h1 class="main-title-left" style="width:100%; font-size:32px; text-align:center;">학교장허가 교외체험학습 통보서</h1>
      <div style="height: 50px;"></div>

      <table class="main-table">
        <colgroup><col width="20%"><col width="80%"></colgroup>
        <tbody>
          <tr>
            <th>성 명</th><td>${s.name || doc.name}</td>
          </tr>
          <tr>
            <th>학년 / 반 / 번</th><td>${s.grade || doc.grade}학년 ${s.classNum || doc.classNum}반 ${s.number || doc.number}번</td>
          </tr>
          <tr>
            <th>허가 기간</th>
            <td>${p.startDate || doc.startDate} ~ ${p.endDate || doc.endDate} (총 ${p.totalDays || doc.totalDays}일)</td>
          </tr>
          <tr>
            <th>장 소</th>
            <td>${pl.location || doc.location}</td>
          </tr>
          <tr>
            <th>누적 사용일</th>
            <td>
              금회 포함 누적: <br>
              국내 <strong>${doc.cumulativeDomestic || 0}</strong>일 / 
              국외 <strong>${doc.cumulativeOverseas || 0}</strong>일
            </td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center; margin: 80px 0; font-size: 20px; font-weight: bold; line-height: 2;">
        위와 같이 허가 처리되었음을 알려 드립니다.
      </div>

      <div class="date-center" style="font-size: 18px;">${todayStr}</div>

      <div class="signature-section" style="text-align: right; margin-right: 40px; margin-top: 50px;">
        <div class="sig-row" style="justify-content: flex-end;">
          <span class="role">${s.grade || doc.grade}학년 ${s.classNum || doc.classNum}반 담임교사 :</span>
          <span class="name">${teacherName}</span> 
          ${teacherSigData ? `<img src="${teacherSigData}" class="sig-img-sm"/>` : '(인)'}
        </div>
      </div>

      <div class="school-master" style="margin-top: 80px; font-size: 24px;">
        보호자님 귀하
      </div>

      <div style="border-top: 2px solid #000; padding-top: 20px; margin-top: 50px; font-size: 14px; line-height: 1.8;">
        <strong>[안내사항]</strong><br>
        1. 결과보고서에 사진(체험학습 장소를 배경으로 보호자와 학생이 함께 있는 사진 포함) 등 증빙자료를 첨부해주십시오.<br>
        2. 연속 5일 이상 교외체험학습 시 주 1회 이상 담임교사와 통화하여 학생의 안전 및 건강을 확인해주십시오.<br>
        3. 교외체험학습 기간 중 안전사고 등 돌발상황 발생 시 즉시 학교로 연락해 주십시오.
      </div>
    </div>
  `;
};