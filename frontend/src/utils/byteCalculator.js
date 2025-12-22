/**
 * NEIS 기준 바이트 계산 함수
 * - 한글/특수문자: 3 byte
 * - 줄바꿈(Enter): 2 byte
 * - 영문/숫자/공백: 1 byte
 */
export const calculateBytes = (text) => {
    if (!text) return 0;
    
    let byte = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      
      if (code === 10) { 
        // 줄바꿈 (Line Feed) -> 2byte
        byte += 2;
      } else if (code > 127) { 
        // 한글 및 유니코드 -> 3byte
        byte += 3;
      } else {
        // 영문, 숫자, 공백 -> 1byte
        byte += 1;
      }
    }
    return byte;
  };