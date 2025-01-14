const USER_ID_KEY = "looq_user_id";

export function getUserId(): string {
	return localStorage.getItem(USER_ID_KEY) || "legacy";
}

export function setUserId(userId: string): void {
	localStorage.setItem(USER_ID_KEY, userId);
}
