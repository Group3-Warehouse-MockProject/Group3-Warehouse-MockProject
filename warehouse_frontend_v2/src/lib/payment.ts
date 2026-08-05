export const BANK_CODE = "MB";
export const BANK_ACCOUNT_NUMBER = "90000015092005";
export const BANK_TRANSFER_IMAGE_TEMPLATE = "compact2";

export function buildBankTransferQrUrl(amount: number, transferContent: string) {
  const params = new URLSearchParams({ addInfo: transferContent.slice(0, 50) });
  if (amount > 0) params.set("amount", String(Math.round(amount)));

  return `https://img.vietqr.io/image/${BANK_CODE}-${BANK_ACCOUNT_NUMBER}-${BANK_TRANSFER_IMAGE_TEMPLATE}.png?${params.toString()}`;
}
