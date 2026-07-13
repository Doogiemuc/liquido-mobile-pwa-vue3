<template>
	<div class="user-home">

		<h1 class="page-title text-center">
			{{ currentUser.name }}
		</h1>

		<section class="profile-picture-section card">
			<div class="card-body">
				<input
					ref="profilePictureInput"
					type="file"
					accept="image/*"
					class="d-none"
					@change="handleFileSelection"
				/>

				<div class="profile-picture-wrapper">
					<img
						v-if="profilePictureUrl"
						:src="profilePictureUrl"
						alt="Profile picture"
						class="profile-picture"
					/>
					<div v-else class="profile-picture profile-picture-placeholder" aria-label="Profile picture placeholder">
						<i class="fas fa-user"></i>
					</div>
				</div>
				<button
					v-if="profilePictureUrl"
					type="button"
					class="btn btn-primary profile-picture-edit-button"
					:disabled="isSavingPhoto"
					@click="openFilePicker"
				>
					{{ isSavingPhoto ? $t("SavingPhoto") : $t("Edit") }}
				</button>

				<div v-if="!profilePictureUrl" class="upload-placeholder mt-4">
					<i class="fas fa-cloud-upload-alt upload-icon"></i>
					<div class="upload-placeholder-title">{{ $t("UploadPhoto") }}</div>
					<div class="upload-placeholder-text">{{ $t("UploadPhotoHint") }}</div>
					<button type="button" class="btn btn-primary mt-3" :disabled="isSavingPhoto" @click="openFilePicker">
						{{ isSavingPhoto ? $t("SavingPhoto") : $t("ChoosePicture") }}
					</button>
				</div>
				<div v-else-if="selectedFileName" class="selected-file-name">
					{{ selectedFileName }}
				</div>
			</div>
		</section>

		<section class="card user-data-card mt-4">
			<div class="card-body">
				<h2 class="card-title mb-3">{{ $t("UserData") }}</h2>

				<liquido-input
					id="userNameInput"
					ref="userNameInput"
					v-model="userForm.name"
					v-model:state="userNameInputState"
					class="mb-3"
					:label="$t('Username')"
					:required="true"
					:disabled="!isEditingUserData"
					:invalid-feedback="$t('UsernameInvalid')"
					:empty-feedback="$t('UsernameRequired')"
					:feedback-placeholder="true"
				/>

				<liquido-input
					id="userEmailInput"
					ref="userEmailInput"
					v-model="userForm.email"
					v-model:state="userEmailInputState"
					class="mb-3"
					type="email"
					:label="$t('EMail')"
					:required="true"
					:disabled="!isEditingUserData"
					:invalid-feedback="$t('EmailInvalid')"
					:empty-feedback="$t('EmailRequired')"
					:feedback-placeholder="true"
				/>

				<liquido-input
					id="userWebsiteInput"
					ref="userWebsiteInput"
					v-model="userForm.website"
					v-model:state="userWebsiteInputState"
					class="mb-3"
					type="url"
					:label="$t('Website')"
					:disabled="!isEditingUserData"
					:valid-func="isOptionalWebsiteValid"
					:invalid-feedback="$t('WebsiteInvalid')"
					:feedback-placeholder="true"
				/>

				<liquido-input
					id="userMobilephoneInput"
					ref="userMobilephoneInput"
					v-model="userForm.mobilephone"
					v-model:state="userMobilephoneInputState"
					type="mobilephone"
					:label="$t('Mobilephone')"
					:disabled="!isEditingUserData"
					:valid-func="isOptionalMobilephoneValid"
					:invalid-feedback="$t('MobilephoneInvalid')"
					:feedback-placeholder="true"
				/>

				<div class="d-flex justify-content-end gap-2 mt-3">
					<button
						v-if="!isEditingUserData"
						id="editUserDataButton"
						type="button"
						class="btn btn-outline-secondary"
						@click="startEditingUserData"
					>
						{{ $t("Edit") }}
					</button>
					<template v-else>
						<button
							id="cancelEditingUserDataButton"
							type="button"
							class="btn btn-outline-secondary"
							@click="cancelEditingUserData"
						>
							{{ $t("Cancel") }}
						</button>
						<button
							id="saveUserDataButton"
							type="button"
							class="btn btn-primary"
							:disabled="isUserDataSaveDisabled"
							@click="saveUserData"
						>
							{{ $t("Save") }}
						</button>
					</template>
				</div>
			</div>
		</section>

		<liquido-footer>
			<template #primary>
				<button type="button" class="btn btn-primary" @click="$root.gotoTeam">
					{{ $t("YourTeam") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>
	</div>
</template>

<script>
import liquidoFooter from "@/components/liquido-footer.vue"
import liquidoInput from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
import localUserPhotoDb from "@/services/local-user-photo-db.js"

const INPUT_INVALID = 3
const urlRegEx = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/
const mobilephoneRegEx = /\+?[0-9/\- ]{6,50}$/

export default {
	i18n: {
		messages: {
			en: {
				UploadPhoto: "Upload photo",
				UploadPhotoHint: "Open your photo library, choose an image, and we will save it locally in IndexedDB.",
				ChoosePicture: "Choose picture",
				UserData: "Your data",
				Username: "Username",
				EMail: "E-mail",
				Website: "Website",
				Mobilephone: "Mobilephone",
				Edit: "Edit",
				Save: "Save",
				YourTeam: "Your team",
				SavingPhoto: "Saving photo ...",
				UsernameRequired: "Please enter a username.",
				UsernameInvalid: "Please enter a username.",
				EmailRequired: "Please enter an e-mail address.",
				EmailInvalid: "Please enter a valid e-mail address.",
				WebsiteInvalid: "Please enter a valid website URL.",
				MobilephoneInvalid: "Please enter a valid mobilephone number.",
				UserDataSaved: "Your user data was updated locally on this device.",
				PhotoSavedLocally: "Your profile picture was saved locally on this device.",
				PhotoSaveError: "Your profile picture could not be saved locally.",
				PhotoLoadError: "Your saved profile picture could not be loaded.",
				InvalidImageFile: "Please choose an image file.",
			},
			de: {
				UploadPhoto: "Avatar erstellen",
				UploadPhotoHint: "Wähle ein schönes Foto für deinen Avatar im Team. Es muss nicht unbedingt ein Foto von dir sein, es kann auch irgend ein anderes Icon oder Bild sein.",
				ChoosePicture: "Bild auswählen",
				UserData: "Deine Daten",
				Username: "Benutzername",
				EMail: "E-Mail",
				Website: "Website",
				Mobilephone: "Mobiltelefon",
				Edit: "Bearbeiten",
				Save: "Speichern",
				YourTeam: "Dein Team",
				SavingPhoto: "Speichere Bild ...",
				UsernameRequired: "Bitte gib einen Benutzernamen ein.",
				UsernameInvalid: "Bitte gib einen Benutzernamen ein.",
				EmailRequired: "Bitte gib eine E-Mail-Adresse ein.",
				EmailInvalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
				WebsiteInvalid: "Bitte gib eine gültige Website-URL ein.",
				MobilephoneInvalid: "Bitte gib eine gültige Mobiltelefonnummer ein.",
				UserDataSaved: "Ok, deine Daten wurden aktualisiert.",
				PhotoSavedLocally: "Ok, dein Profilbild wurde gespeichert.",
				PhotoSaveError: "Ups, sorry. Dein Profilbild konnte gerade nicht gespeichert werden.",
				PhotoLoadError: "Sorry, dein Profilbild konnte gerade nicht geladen werden.",
				InvalidImageFile: "Bitte wähle eine Bilddatei aus.",
			},
		},
	},
	components: { liquidoFooter, liquidoInput },
	data() {
		return {
			profilePictureUrl: undefined,
			isSavingPhoto: false,
			selectedFileName: undefined,
			isEditingUserData: false,
			userNameInputState: undefined,
			userEmailInputState: undefined,
			userWebsiteInputState: undefined,
			userMobilephoneInputState: undefined,
			userForm: {
				name: "",
				email: "",
				website: "",
				mobilephone: "",
			},
		}
	},
	computed: {
		currentUser() {
			return api.getCachedUser() || {}
		},
		isUserDataSaveDisabled() {
			return !this.userForm.name?.trim() ||
				!this.userForm.email?.trim() ||
				this.userNameInputState === INPUT_INVALID ||
				this.userEmailInputState === INPUT_INVALID ||
				this.userWebsiteInputState === INPUT_INVALID ||
				this.userMobilephoneInputState === INPUT_INVALID
		},
	},
	watch: {
		currentUser: {
			handler() {
				if (!this.isEditingUserData) {
					this.resetUserForm()
				}
			},
			immediate: true,
			deep: true,
		},
	},
	async mounted() {
		this.$store.setHeaderTitle(this.currentUser.name)
		this.$store.setHeaderBackTarget(undefined)
		await this.loadStoredProfilePicture()
		this.$root.scrollToTop()
	},
	beforeUnmount() {
		this.revokeProfilePictureUrl()
	},
	methods: {
		openFilePicker() {
			this.$refs.profilePictureInput?.click()
		},

		resetUserForm() {
			const user = this.currentUser || {}
			this.userForm = {
				name: user.name ?? "",
				email: user.email ?? "",
				website: user.website ?? "",
				mobilephone: user.mobilephone ?? "",
			}
			this.userNameInputState = undefined
			this.userEmailInputState = undefined
			this.userWebsiteInputState = undefined
			this.userMobilephoneInputState = undefined
		},

		startEditingUserData() {
			this.resetUserForm()
			this.isEditingUserData = true
		},

		cancelEditingUserData() {
			this.resetUserForm()
			this.isEditingUserData = false
		},

		isOptionalWebsiteValid(value) {
			if (!value || value.trim() === "") return true
			return urlRegEx.test(value)
		},

		isOptionalMobilephoneValid(value) {
			if (!value || value.trim() === "") return true
			return mobilephoneRegEx.test(value)
		},

		validateUserDataForm() {
			this.$refs.userNameInput?.validateField(true)
			this.$refs.userEmailInput?.validateField(true)
			this.$refs.userWebsiteInput?.validateField(true)
			this.$refs.userMobilephoneInput?.validateField(true)

			return this.userNameInputState !== INPUT_INVALID &&
				this.userEmailInputState !== INPUT_INVALID &&
				this.userWebsiteInputState !== INPUT_INVALID &&
				this.userMobilephoneInputState !== INPUT_INVALID
		},

		saveUserData() {
			if (!this.validateUserDataForm()) return

			const cachedUser = api.getCachedUser()
			if (cachedUser) {
				cachedUser.name = this.userForm.name
				cachedUser.email = this.userForm.email
				cachedUser.website = this.userForm.website
				cachedUser.mobilephone = this.userForm.mobilephone
			}

			this.isEditingUserData = false
			this.$store.setHeaderTitle(this.userForm.name)
			this.$root.showSuccess(this.$t("UserDataSaved"), "")
		},

		async handleFileSelection(event) {
			const selectedFile = event.target?.files?.[0]
			if (!selectedFile) return

			if (!selectedFile.type?.startsWith("image/")) {
				this.$root.showError(this.$t("InvalidImageFile"), this.$t("Error"))
				event.target.value = ""
				return
			}

			this.isSavingPhoto = true

			try {
				await localUserPhotoDb.saveProfilePhoto(this.currentUser.id, selectedFile)
				this.selectedFileName = selectedFile.name
				this.setProfilePicturePreview(selectedFile)
				this.$root.showSuccess(this.$t("PhotoSavedLocally"), "")
			} catch (error) {
				console.error("Cannot save profile picture locally", error)
				this.$root.showError(this.$t("PhotoSaveError"), this.$t("Error"))
			} finally {
				this.isSavingPhoto = false
				event.target.value = ""
			}
		},

		async loadStoredProfilePicture() {
			if (!this.currentUser.id) return

			try {
				const storedPhoto = await localUserPhotoDb.getProfilePhoto(this.currentUser.id)
				if (!storedPhoto?.blob) return
				this.selectedFileName = storedPhoto.name
				this.setProfilePicturePreview(storedPhoto.blob)
			} catch (error) {
				console.error("Cannot load stored profile picture", error)
				this.$root.showError(this.$t("PhotoLoadError"), this.$t("Error"))
			}
		},

		setProfilePicturePreview(imageBlob) {
			this.revokeProfilePictureUrl()
			this.profilePictureUrl = URL.createObjectURL(imageBlob)
		},

		revokeProfilePictureUrl() {
			if (!this.profilePictureUrl) return
			URL.revokeObjectURL(this.profilePictureUrl)
			this.profilePictureUrl = undefined
		},
	},
}
</script>

<style>
.user-home {
	padding-bottom: 6rem;
}

.profile-picture-section,
.user-data-card {
	border: 0;
	box-shadow: 0 0.1rem 0.4rem rgba(32, 32, 32, 0.12);
}

.profile-picture-wrapper {
	display: flex;
	justify-content: center;
	margin-top: 0.5rem;
}

.profile-picture {
	width: 11rem;
	height: 11rem;
	border-radius: 50%;
	object-fit: cover;
	border: 4px solid white;
	box-shadow: 0 0.2rem 0.6rem rgba(32, 32, 32, 0.18);
	background: white;
}

.profile-picture-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(180deg, #b8c0cd 0%, #e7edf6 100%);
	color: var(--tertiary);
	font-size: 3.5rem;
}

.profile-picture-edit-button {
	display: block;
	margin: -1rem auto 0;
	position: relative;
	z-index: 1;
	border-radius: 999px;
	padding: 0.35rem 1rem;
	box-shadow: 0 0.2rem 0.6rem rgba(32, 32, 32, 0.18);
}

.upload-placeholder {
	border: 2px dashed #d5dce7;
	border-radius: var(--liquido-border-radius);
	padding: 2rem 1rem;
	text-align: center;
	background-color: var(--light-bg);
}

.upload-icon {
	font-size: 2rem;
	color: var(--primary);
	margin-bottom: 0.75rem;
}

.upload-placeholder-title {
	font-weight: 600;
	margin-bottom: 0.25rem;
}

.upload-placeholder-text {
	color: var(--secondary);
	font-size: 0.95rem;
	
	margin: 0 auto;
}

.selected-file-name {
	margin-top: 1rem;
	color: var(--secondary);
	font-size: var(--font-size-small);
	word-break: break-word;
	text-align: center;
}
</style>
