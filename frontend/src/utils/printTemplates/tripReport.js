import { formatDate } from './common';

// [양식 4] 체험학습 결과보고서 HTML (결재란 삭제)
export const getTripReportHTML = (doc) => {
  // 결재란 제거
  const dateStr = formatDate(doc.createdAt);
  const hasTicket = !!doc.ticket;

  return `
    <div class="page">
      <div class="top-header-area" style="justify-content: center; margin-bottom: 40px;">
        <h1 class="main-title-left" style="width: 100%; text-align: center; font-size:32px;">교외체험학습 결과보고서</h1>
      </div>

      <table class="main-table">
        <colgroup><col width="15%"><col width="35%"><col width="15%"><col width="35%"></colgroup>
        <tbody>
          <tr>
            <th>성 명</th><td>${doc.name}</td>
            <th>학년/반/번</th><td>${doc.grade}학년 ${doc.classNum}반 ${doc.number}번</td>
          </tr>
          <tr>
            <th>기 간</th>
            <td colspan="3">${doc.period}</td>
          </tr>
          <tr>
            <th>장 소</th>
            <td>${doc.destination}</td>
            <th>학습형태</th>
            <td>${doc.learningType || '체험학습'}</td>
          </tr>
          <tr>
            <th>제 목</th>
            <td colspan="3">${doc.title}</td>
          </tr>
          <tr>
            <th style="height: 200px;">내 용</th>
            <td colspan="3" style="vertical-align: top; padding: 10px;">
              ${doc.content ? doc.content.replace(/\n/g, '<br>') : ''}
            </td>
          </tr>
          <tr>
            <th>사진자료<br>(증빙)</th>
            <td colspan="3" style="padding: 10px;">
              <div style="display: flex; gap: 10px; justify-content: center; align-items: flex-start; flex-wrap: wrap;">
                ${doc.photo1 ? `<div style="text-align:center;"><img src="${doc.photo1}" style="max-width: 200px; max-height: 150px; border:1px solid #ccc; display:block; margin:0 auto;"><span style="font-size:11px;">사진1</span></div>` : ''}
                ${doc.photo2 ? `<div style="text-align:center;"><img src="${doc.photo2}" style="max-width: 200px; max-height: 150px; border:1px solid #ccc; display:block; margin:0 auto;"><span style="font-size:11px;">사진2</span></div>` : ''}
                ${hasTicket ? `<div style="text-align:center;"><img src="${doc.ticket}" style="max-width: 200px; max-height: 150px; border:1px solid #ccc; display:block; margin:0 auto;"><span style="font-size:11px;">티켓</span></div>` : ''}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="signature-section" style="margin-top: 50px;">
        <div class="declaration">
          위와 같이 교외체험학습 결과보고서를 제출합니다.
        </div>
        <div class="date-center" style="margin-top: 40px;">${dateStr}</div>
        <div class="signatures" style="flex-direction: column; align-items: center; gap: 15px;">
          <div class="sig-row">
            <span class="role">학 생 :</span><span class="name">${doc.name}</span>
            ${doc.studentSign ? `<img src="${doc.studentSign}" class="sig-img-sm"/>` : '(인)'}
          </div>
          <div class="sig-row">
            <span class="role">보호자 :</span><span class="name">${doc.chaperone || ''}</span>
            ${doc.parentSign ? `<img src="${doc.parentSign}" class="sig-img-sm"/>` : '(인)'}
          </div>
        </div>
        <div class="school-master" style="margin-top: 60px;">상당고등학교장 귀하</div>
      </div>
    </div>
  `;
};