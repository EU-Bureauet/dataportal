// Mock politician data based on actual available data
export const mockPoliticianDetail = {
  id: 2,
  name: "Morten Løkkegaard",
  party: "Venstre",
  partyColor: "#003d82",
  group: "Renew Europe",
  groupColor: "#FFD700",
  
  // Voting statistics
  attendance: 89.5, // percentage
  totalVotes: 1247,
  groupLoyalty: 92.3, // how often votes with EU group
  partyLoyalty: 87.1, // how often votes with national party
  votesWithGroup: 1151,
  votesAgainstGroup: 96,
  
  // Agreement with other Danish MEPs (top 5 most agreed, top 5 least agreed)
  mostAgreedWith: [
    { name: "Karen Melchior", party: "Radikale Venstre", group: "Renew Europe", agreement: 94.2 },
    { name: "Asger Christensen", party: "Venstre", group: "Renew Europe", agreement: 91.8 },
    { name: "Niels Fuglsang", party: "Socialdemokratiet", group: "S&D", agreement: 76.3 },
    { name: "Christel Schaldemose", party: "Socialdemokratiet", group: "S&D", agreement: 74.1 },
    { name: "Margrete Auken", party: "SF", group: "Greens/EFA", agreement: 68.9 }
  ],
  
  leastAgreedWith: [
    { name: "Anders Vistisen", party: "Dansk Folkeparti", group: "ECR", agreement: 23.4 },
    { name: "Peter Kofod", party: "Dansk Folkeparti", group: "ECR", agreement: 25.7 },
    { name: "Pernille Weiss", party: "Konservative", group: "EPP", agreement: 42.3 },
    { name: "Özlem Cekic", party: "SF", group: "Greens/EFA", agreement: 45.8 },
    { name: "Kira Marie Peter-Hansen", party: "SF", group: "Greens/EFA", agreement: 47.2 }
  ],
  
  // Comparison to national party colleagues
  partyColleagues: [
    { name: "Asger Christensen", agreement: 91.8, sameness: "høj" },
    { name: "Søren Gade", agreement: 88.3, sameness: "høj" }
  ],
  
  // Recent important votes showing alignment
  recentVotes: [
    { 
      title: "Digital Services Act", 
      date: "2024-08-15", 
      position: "For", 
      groupPosition: "For", 
      partyPosition: "For",
      result: "Vedtaget",
      agreementLevel: "Fuld enighed"
    },
    { 
      title: "Green Deal Implementation", 
      date: "2024-07-22", 
      position: "For", 
      groupPosition: "For", 
      partyPosition: "Imod",
      result: "Vedtaget",
      agreementLevel: "Gruppe over parti"
    },
    { 
      title: "Migration Pact Reform", 
      date: "2024-06-18", 
      position: "Imod", 
      groupPosition: "For", 
      partyPosition: "Imod",
      result: "Vedtaget",
      agreementLevel: "Parti over gruppe"
    },
    { 
      title: "AI Regulation Framework", 
      date: "2024-05-30", 
      position: "For", 
      groupPosition: "For", 
      partyPosition: "For",
      result: "Vedtaget",
      agreementLevel: "Fuld enighed"
    }
  ]
};