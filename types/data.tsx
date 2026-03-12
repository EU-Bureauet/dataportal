// Type for committee and group names from JSON
export interface CommitteeAndGroupNames {
  committee_names: Record<string, string>;
  political_group_names: Record<string, string>;
}

export interface GlobalStats {
    "Afstemninger ved seneste plenarsamling": number,
    "Afstemninger i hele valgperioden": number,
}

export interface Disagreement {
    "MEP Name": string,
}

export interface Disagreements {
    "latest_mep_vs_party": {"disagreements": Array<Disagreement>},
    "mep_vs_party": {"disagreements": Array<Disagreement>},
}

// Coalition data interfaces
export interface Coalition {
    "Winning Coalition": string[];
    "Count": number;
    "Percentage": number;
}

export interface CoalitionCategory {
    total_coalitions: Coalition[];
}

export interface CoalitionsData {
    TOTAL: CoalitionCategory;
    [key: string]: CoalitionCategory;
}

// Pairwise coalition data interfaces
export interface PairwiseCoalition {
    "Group Pair": string[];
    "Total": number;
    "Count": number;
    "Percentage": number;
}

export interface PairwiseCoalitionsData {
    TOTAL: PairwiseCoalition[];
    [key: string]: PairwiseCoalition[];
}

// Group wins data interfaces
export interface GroupWin {
    "Group ID": string;
    "Win Count": number;
    "Win Percentage": number;
}

export interface GroupWinsCategory {
    total_group_wins: GroupWin[];
}

export interface GroupWinsData {
    TOTAL: GroupWinsCategory;
    [key: string]: GroupWinsCategory | GroupWin[];
}

// Committee metadata interfaces
export interface CommitteeInfo {
    code: string;
    name: string;
    total_votes: number;
    total_vote_instances: number;
    percentage_of_all_votes: number;
}

export interface Vote {
    vote_id: string;
    title: string;
    short_title?: string;
    description: string;
    date: string;
    total_votes_cast: number;
    majority_decision: string;
    vote_distribution: {
      For: number;
      Against: number;
      Abstention: number;
    };
    consensus_measure: number;
}

export interface Case {
    title: string;
    total_votes: number;
    first_vote_date: string;
    last_vote_date: string;
    descriptions: string[];
}

export interface SubjectMatterFrequency {
    subject_matter: string;
    count: number;
    percentage: number;
}

export interface EurovocFrequency {
    eurovoc_term: string;
    count: number;
    percentage: number;
}

export interface CommitteeMember {
    mep_id: string;
    name: string;
    country: string;
    political_group: string;
    role: string;
    organization_id: string;
    function_id: string;
}

export interface CommitteeMetadata {
    committee_info: CommitteeInfo;
    documents_and_cases: {
        votes: {
            total_votes: number;
            votes: Vote[];
        };
        cases: {
            total_cases: number;
            cases: Case[];
        };
    };
    subject_matter_analysis: {
        unique_subject_matters: number;
        subject_matter_frequency: SubjectMatterFrequency[];
    };
    eurovoc_analysis: {
        unique_eurovoc_terms: number;
        eurovoc_frequency: EurovocFrequency[];
    };
    time_period: {
        first_vote: string;
        last_vote: string;
        active_days: number;
    };
    committee_membership: {
        total_members: number;
        members: CommitteeMember[];
        roles_summary: {
            [key: string]: number;
        };
        filter_date: string;
        committee_name: string;
        note: string;
    };
}

// Interface for individual membership
interface Membership {
  organization_id: string;
  organization_code: string;
  organization_name: string;
  role: string;
  startDate: string;
  endDate: string | null;
  active: number;
}

// Type for the API response from meps_clean.json
export interface MEPData {
  mep_id: string;
  full_name: string;
  country_code: string;
  place_of_birth: string;
  birthdate: string;
  family_name: string;
  given_name: string;
  sort_label: string;
  photo_url: string;
  national_party_id: {
    name: string;
    code: string;
  };
  current_group_id: {
    name: string;
    code: string;
  };
  links: {
    homepage: string | null;
    ep_profile: string;
    account: any[] | null;
  };
  memberships: {
    [key: string]: Membership[];
  };
  n_votes: number;
  n_votes_with_group: number;
  n_votes_against_group: number;
  participation_pct: number;
  group_loyalty: number;
}

// Type for the voting overlap API response from mep_overlap.json
export interface VotingOverlap {
  filter: string;
  mep_id_a: string;
  mep_id_b: string;
  counts: {
    total_joint_votes: number;
    agree: number;
    disagree: number;
  };
  overlap_rate: number;
}

// Root structure for the APIs
export interface MEPResponse {
  meps: MEPData[];
}

export interface OverlapResponse {
  voting_overlap: VotingOverlap[];
}

// Type for our transformed politician data
export interface Politician {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  group: string;
  votes: number;
  attendancePercentage: number;
  photoUrl: string;
}

// Party color mapping for Danish political parties (updated with new API party names)
export const PARTY_COLORS: { [key: string]: string } = {
  "Socialdemokratiet": "#E3001A",
  "Danmarks Socialdemokratiske Parti": "#E3001A",
  "Socialistisk Folkeparti": "#9C1A6C",
  "Det Radikale Venstre": "#E17000",
  "Radikale Venstre": "#E17000",
  "Venstre, Danmarks Liberale Parti": "#003D73",
  "Venstre": "#003D73",
  "Det Konservative Folkeparti": "#004B87",
  "Konservative Folkeparti": "#004B87",
  "Dansk Folkeparti": "#FFE500",
  "Liberal Alliance": "#0F6BA6",
  "Enhedslisten": "#FF0000",
  "Enhedslisten - De Rød-Grønne": "#FF0000",
  "Moderaterne": "#732982",
  "Danmarksdemokraterne": "#00205B",
  "Nye Borgerlige": "#056F96",
};

// Helper function to format names with proper capitalization
function formatName(fullName: string): string {
  return fullName
    .split(' ')
    .map(part => {
      // Handle hyphenated names and names with special characters
      return part
        .split('-')
        .map(subPart => {
          return subPart.charAt(0).toUpperCase() + subPart.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
}

// Helper function to transform new API data to our Politician type
export function transformMEPData(data: MEPData[]): Politician[] {
  return data
    .filter(politician => politician.country_code.includes("DNK"))
    .map(politician => ({
      id: politician.mep_id,
      name: formatName(politician.full_name),
      party: politician.national_party_id.name,
      partyColor: PARTY_COLORS[politician.national_party_id.name] || "#6B7280",
      group: politician.current_group_id.name,
      votes: politician.n_votes,
      attendancePercentage: politician.participation_pct,
      photoUrl: politician.photo_url
    }))
    .sort((a, b) => b.votes - a.votes);
}

// Helper function to get voting agreements/disagreements for a politician
export function getMEPAgreements(mepId: string, overlapData: VotingOverlap[], filter: string = "all"): {
  agreements: Array<{mepId: string, overlapRate: number, totalVotes: number}>;
  disagreements: Array<{mepId: string, overlapRate: number, totalVotes: number}>;
} {
  const filteredData = overlapData.filter(overlap => overlap.filter === filter);

  const agreements = filteredData
    .filter(overlap => (overlap.mep_id_a === mepId || overlap.mep_id_b === mepId) && overlap.overlap_rate >= 0.7)
    .map(overlap => ({
      mepId: overlap.mep_id_a === mepId ? overlap.mep_id_b : overlap.mep_id_a,
      overlapRate: overlap.overlap_rate,
      totalVotes: overlap.counts.total_joint_votes
    }))
    .sort((a, b) => b.overlapRate - a.overlapRate);

  const disagreements = filteredData
    .filter(overlap => (overlap.mep_id_a === mepId || overlap.mep_id_b === mepId) && overlap.overlap_rate < 0.5)
    .map(overlap => ({
      mepId: overlap.mep_id_a === mepId ? overlap.mep_id_b : overlap.mep_id_a,
      overlapRate: overlap.overlap_rate,
      totalVotes: overlap.counts.total_joint_votes
    }))
    .sort((a, b) => a.overlapRate - b.overlapRate);

  return { agreements, disagreements };
}

// Interface for detailed politician information
export interface DetailedPolitician {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  group: string;
  votes: number;
  attendancePercentage: number;
  photoUrl: string;
  groupLoyalty: number;
  votesWithGroup: number;
  votesAgainstGroup: number;
}

// Interface for agreement/disagreement display
export interface AgreementData {
  name: string;
  party: string;
  group: string;
  agreement: number; // percentage
  partyColor: string;
}

// Interface for committee membership
export interface CommitteeMembership {
  organizationName: string;
  organizationCode: string;
  role: string;
  startDate: string;
}

// Helper function to get current committee memberships (all active roles)
export function getCurrentCommitteeMemberships(mepData: MEPData): CommitteeMembership[] {
  const committeeData = mepData.memberships?.["def/ep-entities/COMMITTEE_PARLIAMENTARY_STANDING"];

  if (!committeeData) return [];

  return committeeData
    .filter(membership => membership.active === 1)
    .map(membership => ({
      organizationName: membership.organization_name,
      organizationCode: membership.organization_code,
      role: membership.role,
      startDate: membership.startDate
    }))
    .sort((a, b) => a.organizationName.localeCompare(b.organizationName));
}

// Helper function to get previous committee memberships (inactive)
export function getPreviousCommitteeMemberships(mepData: MEPData): CommitteeMembership[] {
  const committeeData = mepData.memberships?.["def/ep-entities/COMMITTEE_PARLIAMENTARY_STANDING"];

  if (!committeeData) return [];

  return committeeData
    .filter(membership => membership.active === 0)
    .map(membership => ({
      organizationName: membership.organization_name,
      organizationCode: membership.organization_code,
      role: membership.role,
      startDate: membership.startDate
    }))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

// Helper function to format role names for display
export function formatRole(role: string): string {
  switch (role) {
    case "def/ep-roles/MEMBER":
      return "Medlem";
    case "def/ep-roles/MEMBER_SUBSTITUTE":
      return "Suppleant";
    case "def/ep-roles/CHAIR":
      return "Formand";
    case "def/ep-roles/VICE_CHAIR":
      return "Næstformand";
    default:
      return role.replace("def/ep-roles/", "").replace("_", " ");
  }
}

// @deprecated Brug i stedet committee_and_group_names.json direkte
// Committee name mapping for display
export const COMMITTEE_NAMES: { [key: string]: string } = {
  "AFCO": "Konstitutionelle anliggender",
  "AFET": "Udenrigsanliggender",
  "AGRI": "Landbrug og udvikling af landdistrikter",
  "BUDG": "Budget",
  "CONT": "Budgetkontrol",
  "CULT": "Kultur og uddannelse",
  "DEVE": "Udvikling",
  "ECON": "Økonomi og valuta",
  "EMPL": "Beskæftigelse og sociale anliggender",
  "ENVI": "Miljø, folkesundhed og fødevaresikkerhed",
  "FEMM": "Ligestilling",
  "IMCO": "Det indre marked og forbrugerbeskyttelse",
  "INTA": "International handel",
  "ITRE": "Industri, forskning og energi",
  "JURI": "Retsudvalget",
  "LIBE": "Borgernes rettigheder, retlige og indre anliggender",
  "PECH": "Fiskeri",
  "PETI": "Andragender",
  "REGI": "Regional udvikling",
  "SANT": "Sundhed og levnedsmidler",
  "TRAN": "Transport og turisme",
  "all": "Alle afstemninger"
};

// Helper function to get available committees from overlap data
export function getAvailableCommittees(overlapData: VotingOverlap[]): Array<{code: string, name: string}> {
  // Import committee names from JSON file
  const committeeNamesData = require("@/data/committee_and_group_names.json");
  
  const committees = [...new Set(overlapData.map(overlap => overlap.filter))]
    .filter(filter => filter !== "all")
    .sort()
    .map(code => ({
      code,
      name: committeeNamesData.committee_names[code] || code
    }));

  return [
    { code: "all", name: "Alle afstemninger" },
    ...committees
  ];
}

// Helper function to convert MEP data to detailed politician
export function toDetailedPolitician(mepData: MEPData): DetailedPolitician {
  return {
    id: mepData.mep_id,
    name: formatName(mepData.full_name),
    party: mepData.national_party_id.name,
    partyColor: PARTY_COLORS[mepData.national_party_id.name] || "#6B7280",
    group: mepData.current_group_id.name,
    votes: mepData.n_votes,
    attendancePercentage: mepData.participation_pct,
    photoUrl: mepData.photo_url,
    groupLoyalty: mepData.group_loyalty,
    votesWithGroup: mepData.n_votes_with_group,
    votesAgainstGroup: mepData.n_votes_against_group
  };
}

// Vote details interfaces
export interface VoteGroupBreakdown {
  Group: string;
  For: number;
  Against: number;
  Abstention: number;
  "Did not vote"?: number;
}

export interface VoteCountryBreakdown {
  Country: string;
  For: number;
  Against: number;
  Abstention: number;
  "Did not vote"?: number;
  "Potential Disagreement"?: boolean;
}

export interface NationalPartyDisagreement {
  "MEP Name": string;
  "MEP ID": string;
  Vote: string;
  "National Party": string;
  Country: string;
  "Political Group": string;
}

export interface RelatedVote {
  "Vote ID": string;
  "Vote Description": string;
  For: number;
  Against: number;
  Abstention: number;
}

export interface MEPVote {
  "MEP Name": string;
  "MEP ID": string;
  Vote: string;
  Country: string;
  "Political Group": string;
  "National Party": string;
}

export interface WinningCoalitionInfo {
  "Winning Coalition": string[];
  "Majority Vote": string;
  "Coalition Frequency": number;
  "Coalition Classification": string;
}

export interface VoteDetails {
  "Vote ID": string;
  "Vote Description": string;
  "Sitting Date": string;
  "Document Title"?: string;
  "Document Link"?: string;
  "Short Title"?: string;
  short_title?: string;
  Subjectmatter?: Array<{code: string; name?: string}>;
  Committees?: Array<{code: string; name: string}>;
  "Eurovoc Topics"?: Array<{id: string; label: string}>;
  Result?: {
    For: number;
    Against: number;
    Abstention: number;
  };
  Participation?: number;
  Consensus?: number;
  Majority?: string;
  "By Group"?: {[groupName: string]: {For: number; Against: number; Abstention: number}};
  "By Country"?: {[countryName: string]: {For: number; Against: number; Abstention: number; "Did not vote"?: number; "Potential Disagreement"?: boolean; Disagreements?: number}};
  "National Party Disagreements"?: {[partyName: string]: NationalPartyDisagreement[]};
  "Winning Coalition"?: WinningCoalitionInfo;
  "Related Votes"?: RelatedVote[];
  "Votes by MEP"?: MEPVote[];
}

// MEP vs National Party disagreement interfaces
export interface MEPDisagreementCount {
  "MEP Name": string;
  "Disagreement_Count": number;
  "National_Group": string;
  "Political_Group": string;
}

export interface MEPPartyDisagreement {
  "Vote ID": string;
  "Vote Description": string;
  "Document Title": string;
  "Document Link": string;
  "MEP Name": string;
  "Vote Type": string;
  "Vote Type_Majority": string;
  "Group ID": string;
  "Group Majority Percentage": number;
  ECR?: string;
  ESN?: string;
  NI?: string;
  PPE?: string;
  PfE?: string;
  Renew?: string;
  "S&D"?: string;
  "The Left"?: string;
  "Verts/ALE"?: string;
}

export interface MEPPartyDisagreements {
  mep_vs_party: {
    disagreements: MEPPartyDisagreement[];
    mep_disagreement_counts: MEPDisagreementCount[];
  };
  latest_mep_vs_party: {
    disagreements: MEPPartyDisagreement[];
    mep_disagreement_counts: MEPDisagreementCount[];
  };
}

// National party disagreements interfaces
export interface NationalPartyMEPInfo {
  mep_id: string;
  name: string;
  political_group: string;
}

export interface NationalPartyInfo {
  name: string;
  total_meps: number;
  meps: NationalPartyMEPInfo[];
}

export interface DisagreementStatistics {
  total_disagreements: number;
  total_votes_analyzed: number;
  disagreement_rate_percent: number;
}

export interface DisagreementVoteBreakdown {
  For?: string[];
  Against?: string[];
  Abstention?: string[];
}

export interface DisagreementVote {
  vote_id: string;
  vote_description: string;
  sitting_date: string;
  participating_meps: number;
  total_party_meps: number;
  vote_breakdown: DisagreementVoteBreakdown;
  mep_votes: {
    [mepName: string]: string;
  };
}

export interface PartyDisagreementData {
  party_info: NationalPartyInfo;
  disagreement_statistics: DisagreementStatistics;
  disagreement_votes: DisagreementVote[];
}

export interface NationalPartyDisagreementsMetadata {
  generated: string;
  total_parties_analyzed: number;
  total_votes_in_dataset: number;
  description: string;
}

export interface NationalPartyDisagreementsData {
  metadata: NationalPartyDisagreementsMetadata;
  parties: {
    [partyName: string]: PartyDisagreementData;
  };
}

// Helper function to extract country from party name
export function extractCountryFromPartyName(partyName: string): {
  partyNameWithoutCountry: string;
  country: string;
} {
  const match = partyName.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    return {
      partyNameWithoutCountry: match[1].trim(),
      country: match[2].trim()
    };
  }
  return {
    partyNameWithoutCountry: partyName,
    country: ""
  };
}

// MEP and Group vote comparison interfaces
export interface MEPVoteInfo {
  mep_id: string;
  name: string;
  political_group: string;
  national_group: string;
  country: string;
}

export interface GroupVoteInfo {
  group_id: string;
  name: string;
  type: string;
  total_meps: number;
  is_danish: boolean;
}

export interface VoteStatistics {
  total_votes: number;
  votes_for: number;
  votes_against: number;
  abstentions: number;
  participation_rate: number;
}

export interface MEPVoteData {
  mep_info: MEPVoteInfo;
  vote_ids: string[];
  votes: (number | null)[]; // 1 = For, -1 = Against, 0 = Abstention, null = Not participated
  statistics: VoteStatistics;
  generated: string;
}

export interface GroupVoteData {
  group_info: GroupVoteInfo;
  vote_ids: string[];
  votes: (number | null)[]; // 1 = For, -1 = Against, 0 = Abstention, null = Not participated
  statistics: VoteStatistics;
  generated: string;
}

export interface VoteComparison {
  vote_id: string;
  index: number;
  entity1_vote: number | null;
  entity2_vote: number | null;
  agreement: boolean;
}

export interface ComparisonResult {
  agreement_rate: number;
  disagreement_rate: number;
  total_comparable_votes: number;
  agreement_count: number;
  disagreement_count: number;
  agreements: VoteComparison[];
  disagreements: VoteComparison[];
}

// Vote encoding helper functions
export function voteValueToLabel(vote: number | null): string {
  if (vote === 1) return "For";
  if (vote === -1) return "Against";
  if (vote === 0) return "Abstention";
  return "Not participated";
}

export function voteValueToColor(vote: number | null): string {
  if (vote === 1) return "text-green-700";
  if (vote === -1) return "text-red-700";
  if (vote === 0) return "text-yellow-700";
  return "text-gray-400";
}

export function voteValueToBgColor(vote: number | null): string {
  if (vote === 1) return "bg-green-100";
  if (vote === -1) return "bg-red-100";
  if (vote === 0) return "bg-yellow-100";
  return "bg-gray-100";
}