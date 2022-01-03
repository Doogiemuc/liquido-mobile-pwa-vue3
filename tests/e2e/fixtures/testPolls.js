//
// ==========DUMMY DATA FOR TESTING ==========
//

// just a dummy to create test data
let addDays = function (date, days) {
	let result = new Date(date)
	result.setDate(result.getDate() + days)
	return result
}

export default [
	{
		id: 99,
		title: "Ich bin eine neue erstellte Abstimmung",
		status: "ELABORATION",
		votingStartAt: addDays(new Date(), 10),
		votingEndAt: addDays(new Date(), 20),
	},
	{
		id: 101,
		title: "Example poll in voting with a very long titela asddfasdf dd",
		status: "VOTING",
		votingStartAt: addDays(new Date(), -1),
		votingEndAt: addDays(new Date(), +9),

		proposals: [
			{
				id: 2001,
				title: "Proposal One qurg ASD asdfcvvef fdadsf ddd fff ddccc c ewe e",
				description:
					"Just an example proposal Bei relativ positionierten Elementen (position: relative) wird das Element aus seiner normalen Position im Elementfluss verschoben. Dabei gilt: Wenn die top Eigenschaft definiert wurde, überschreibt diese den Wert der bottom Eigenschaft. Wenn top den Wert auto besitzt, ist der berechnete Wert für bottom gleich dem Wert der top Eigenschaft mit umgedrehtem Vorzeichen. Wenn beide Eigenschaften nicht den Wert auto besitzen, wird bottom ignoriert und auf auto gesetzt.",
				status: "VOTING",
				createdAt: new Date(),

				updatedAt: new Date(),
				area: {
					id: 4001,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 15,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7001,
					email: "user1@liqudo.vote",
					profile: {
						name: "User1longname Mobileasdf",
						mobilephone: "#491234517",
						picture: "/img/avatars/Avatar1.png",
					},
				},
			},
			{
				id: 2002,
				title: "Proposal Two",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 9,
				supportedByCurrentUser: false,
				createdBy: {
					id: 7002,
					email: "user2@liqudo.vote",
					profile: {
						name: "User2 Mobile",
						mobilephone: "#491234518",
						picture: "/img/avatars/Avatar2.png",
					},
				},
			},
			{
				id: 2003,
				title:
					"Proposal Three with a very long title that will break more than three lines just to besure we make it very long",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 92345,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7002,
					email: "user4@liqudo.vote",
					profile: {
						name: "User4 Mobile",
						mobilephone: "#491234514",
						picture: "/img/avatars/Avatar4.png",
					},
				},
			},
		],
		area: {
			id: 4001,
			title: "Example Area",
		},
		winner: undefined,
		duelMatrix: undefined,
	},

	{
		id: 102,
		title: "Example poll in elaboration",
		status: "ELABORATION",
		votingStartAt: addDays(new Date(), -5),
		votingEndAt: addDays(new Date(), +9),

		proposals: [
			{
				id: 2001,
				title: "Proposal One qurg ASD asdfcvvef fdadsf ddd fff ddccc c ewe e",
				description:
					"Just an example proposal Bei relativ positionierten Elementen (position: relative) wird das Element aus seiner normalen Position im Elementfluss verschoben. Dabei gilt: Wenn die top Eigenschaft definiert wurde, überschreibt diese den Wert der bottom Eigenschaft. Wenn top den Wert auto besitzt, ist der berechnete Wert für bottom gleich dem Wert der top Eigenschaft mit umgedrehtem Vorzeichen. Wenn beide Eigenschaften nicht den Wert auto besitzen, wird bottom ignoriert und auf auto gesetzt.",
				status: "VOTING",
				createdAt: new Date(),

				updatedAt: new Date(),
				area: {
					id: 4001,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 15,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7001,
					email: "user1@liqudo.vote",
					profile: {
						name: "User1longname Mobileasdf",
						mobilephone: "#491234517",
						picture: "/img/avatars/Avatar1.png",
					},
				},
			},
			{
				id: 2002,
				title: "Proposal Two",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 9,
				supportedByCurrentUser: false,
				createdBy: {
					id: 7002,
					email: "user2@liqudo.vote",
					profile: {
						name: "User2 Mobile",
						mobilephone: "#491234518",
						picture: "/img/avatars/Avatar2.png",
					},
				},
			},
			{
				id: 2003,
				title:
					"Proposal Three with a very long title that will break more than three lines just to besure we make it very long",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 92345,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7002,
					email: "user4@liqudo.vote",
					profile: {
						name: "User4 Mobile",
						mobilephone: "#491234514",
						picture: "/img/avatars/Avatar4.png",
					},
				},
			},
		],
		area: {
			id: 4001,
			title: "Example Area",
		},
		winner: undefined,
		duelMatrix: undefined,
	},

	{
		id: 103,
		title: "Poll numbe two",
		status: "ELABORATION",
		votingStartAt: addDays(new Date(), -1),
		votingEndAt: addDays(new Date(), +9),

		proposals: [
			{
				id: 2001,
				title: "Proposal One qurg ASD asdfcvvef fdadsf ddd fff ddccc c ewe e",
				description:
					"Just an example proposal Bei relativ positionierten Elementen (position: relative) wird das Element aus seiner normalen Position im Elementfluss verschoben. Dabei gilt: Wenn die top Eigenschaft definiert wurde, überschreibt diese den Wert der bottom Eigenschaft. Wenn top den Wert auto besitzt, ist der berechnete Wert für bottom gleich dem Wert der top Eigenschaft mit umgedrehtem Vorzeichen. Wenn beide Eigenschaften nicht den Wert auto besitzen, wird bottom ignoriert und auf auto gesetzt.",
				status: "VOTING",
				createdAt: new Date(),

				updatedAt: new Date(),
				area: {
					id: 4001,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 15,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7001,
					email: "user1@liqudo.vote",
					profile: {
						name: "User1longname Mobileasdf",
						mobilephone: "#491234517",
						picture: "/img/avatars/Avatar1.png",
					},
				},
			},
			{
				id: 2002,
				title: "Proposal Threeeeeeee eee e e e",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 9,
				supportedByCurrentUser: false,
				createdBy: {
					id: 7002,
					email: "user2@liqudo.vote",
					profile: {
						name: "User2 Mobile",
						mobilephone: "#491234518",
						picture: "/img/avatars/Avatar2.png",
					},
				},
			},
			{
				id: 2003,
				title:
					"Proposal Three with a very long title that will break more than three lines just to besure we make it very long",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 92345,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7002,
					email: "user4@liqudo.vote",
					profile: {
						name: "User4 Mobile",
						mobilephone: "#491234514",
						picture: "/img/avatars/Avatar4.png",
					},
				},
			},
		],
		area: {
			id: 4001,
			title: "Example Area",
		},
		winner: undefined,
		duelMatrix: undefined,
	},

	{
		id: 104,
		title: "Poll numbe four",
		status: "ELABORATION",
		votingStartAt: addDays(new Date(), -1),
		votingEndAt: addDays(new Date(), +9),

		proposals: [
			{
				id: 2001,
				title: "Proposal One qurg ASD asdfcvvef fdadsf ddd fff ddccc c ewe e",
				description:
					"Just an example proposal Bei relativ positionierten Elementen (position: relative) wird das Element aus seiner normalen Position im Elementfluss verschoben. Dabei gilt: Wenn die top Eigenschaft definiert wurde, überschreibt diese den Wert der bottom Eigenschaft. Wenn top den Wert auto besitzt, ist der berechnete Wert für bottom gleich dem Wert der top Eigenschaft mit umgedrehtem Vorzeichen. Wenn beide Eigenschaften nicht den Wert auto besitzen, wird bottom ignoriert und auf auto gesetzt.",
				status: "VOTING",
				createdAt: new Date(),

				updatedAt: new Date(),
				area: {
					id: 4001,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 15,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7001,
					email: "user1@liqudo.vote",
					profile: {
						name: "User1longname Mobileasdf",
						mobilephone: "#491234517",
						picture: "/img/avatars/Avatar1.png",
					},
				},
			},
			{
				id: 2002,
				title: "Proposal Two",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 9,
				supportedByCurrentUser: false,
				createdBy: {
					id: 7002,
					email: "user2@liqudo.vote",
					profile: {
						name: "User2 Mobile",
						mobilephone: "#491234518",
						picture: "/img/avatars/Avatar2.png",
					},
				},
			},
			{
				id: 2003,
				title:
					"Proposal Three with a very long title that will break more than three lines just to besure we make it very long",
				description:
					"Yet another example proposal xcvxclk c vd xc asdf cxvyxcv yxcv xycv ",
				status: "VOTING",
				createdAt: new Date(),
				updatedAt: new Date(),
				area: {
					id: 4002,
					title: "Example Area",
				},
				supporters: [],
				numSupporters: 92345,
				supportedByCurrentUser: true,
				createdBy: {
					id: 7002,
					email: "user4@liqudo.vote",
					profile: {
						name: "User4 Mobile",
						mobilephone: "#491234514",
						picture: "/img/avatars/Avatar4.png",
					},
				},
			},
		],
		area: {
			id: 4001,
			title: "Example Area",
		},
		winner: undefined,
		duelMatrix: undefined,
	},
]
