import { beforeEach, describe, expect, it } from 'vitest'
import { store } from '@/services/store'

describe('header state store', () => {
	beforeEach(() => {
		store.headerTitle = undefined
		store.headerBackTarget = undefined
		store.headerRight = undefined
	})

	it('stores and clears header-right content', () => {
		store.setHeaderRight('createNewPoll')
		expect(store.headerRight).toBe('createNewPoll')

		store.clearHeaderRight()
		expect(store.headerRight).toBeUndefined()
	})
})
