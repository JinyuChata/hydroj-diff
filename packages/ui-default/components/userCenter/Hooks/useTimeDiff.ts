import dayjs from "dayjs";

export function getTimeDiffFromNow(time: Date) {
  const diff = dayjs().diff(time, "millisecond");

  if (diff < 60000) {
    return "一分钟内";
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  } else if (diff < 2592000000) {
    const days = Math.floor(diff / 86400000);
    return `${days}天前`;
  } else if (diff < 31536000000) {
    const months = Math.floor(diff / 2592000000);
    return `${months}月前`;
  } else {
    const years = Math.floor(diff / 31536000000);
    return `${years}年前`;
  }
}
