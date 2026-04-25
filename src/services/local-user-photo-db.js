import Dexie from "dexie"

const db = new Dexie("LiquidoLocalAssetsDB")

db.version(1).stores({
	userProfilePhotos: "&userId, updatedAt",
})

export default {
	async getProfilePhoto(userId) {
		if (!userId) return undefined
		return db.userProfilePhotos.get(userId)
	},

	async saveProfilePhoto(userId, fileBlob) {
		if (!userId) throw new Error("Missing userId")
		if (!fileBlob) throw new Error("Missing file blob")

		const photoRecord = {
			userId,
			blob: fileBlob,
			mimeType: fileBlob.type,
			name: fileBlob.name,
			size: fileBlob.size,
			updatedAt: new Date().toISOString(),
		}

		await db.userProfilePhotos.put(photoRecord)
		return photoRecord
	},
}
