import mask from "maskdata";

type MaskMailSettings = {
  maxDomainEndChars?: number;
  numStartChars?: number;
  showDomain?: boolean;
};

const MaskEmailDefaultSettings: MaskMailSettings = {
  maxDomainEndChars: 10, 
  numStartChars: 4, 
  showDomain: true
};

export function maskEmail(email: string, settings: MaskMailSettings = MaskEmailDefaultSettings) {
  const { maxDomainEndChars, numStartChars, showDomain } = settings;
  
  return mask.maskEmail2(email, {
    unmaskedEndCharactersAfterAt: maxDomainEndChars,
    unmaskedStartCharactersBeforeAt: numStartChars,
    maskAtTheRate: showDomain,
  });
}