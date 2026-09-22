import type { Employee, Visitor, Visit, Settings, Status } from '../domain/types'

export const DEFAULT_SETTINGS: Settings = {
  maxPreApprovalsPerDay: 5,
  visitTypes: [
    'Business Guests',
    'Vendor',
    'Personnel',
    'Govt Officials',
    'Interview',
    'Others',
  ],
  offices: [
    'Mumbai Goregaon',
    'Bengaluru Whitefield',
    'Delhi CyberCity',
    'Pune Hinjewadi',
    'Hyderabad Hitec',
  ],
}

export const SEED_EMPLOYEES: Employee[] = [
  // Engineering (6)
  { id: 'emp-01', name: 'Aarav Sharma', dept: 'Engineering', email: 'aarav.sharma@acme.corp', phone: '+91 98200 11001' },
  { id: 'emp-02', name: 'Diya Patel', dept: 'Engineering', email: 'diya.patel@acme.corp', phone: '+91 98200 11002' },
  { id: 'emp-03', name: 'Rohan Gupta', dept: 'Engineering', email: 'rohan.gupta@acme.corp', phone: '+91 98200 11003' },
  { id: 'emp-04', name: 'Ananya Iyer', dept: 'Engineering', email: 'ananya.iyer@acme.corp', phone: '+91 98200 11004' },
  { id: 'emp-05', name: 'Vikram Malhotra', dept: 'Engineering', email: 'vikram.malhotra@acme.corp', phone: '+91 98200 11005' },
  { id: 'emp-06', name: 'Meera Nair', dept: 'Engineering', email: 'meera.nair@acme.corp', phone: '+91 98200 11006' },

  // Human Resources (4)
  { id: 'emp-07', name: 'Kavita Reddy', dept: 'Human Resources', email: 'kavita.reddy@acme.corp', phone: '+91 98200 11007' },
  { id: 'emp-08', name: 'Arjun Das', dept: 'Human Resources', email: 'arjun.das@acme.corp', phone: '+91 98200 11008' },
  { id: 'emp-09', name: 'Sneha Kulkarni', dept: 'Human Resources', email: 'sneha.kulkarni@acme.corp', phone: '+91 98200 11009' },
  { id: 'emp-10', name: 'Rahul Joshi', dept: 'Human Resources', email: 'rahul.joshi@acme.corp', phone: '+91 98200 11010' },

  // Facilities (4)
  { id: 'emp-11', name: 'Rajesh Kumar', dept: 'Facilities', email: 'rajesh.kumar@acme.corp', phone: '+91 98200 11011' },
  { id: 'emp-12', name: 'Sunita Rao', dept: 'Facilities', email: 'sunita.rao@acme.corp', phone: '+91 98200 11012' },
  { id: 'emp-13', name: 'Amitabh Sen', dept: 'Facilities', email: 'amitabh.sen@acme.corp', phone: '+91 98200 11013' },
  { id: 'emp-14', name: 'Pooja Verma', dept: 'Facilities', email: 'pooja.verma@acme.corp', phone: '+91 98200 11014' },

  // Operations (4)
  { id: 'emp-15', name: 'Karan Mehra', dept: 'Operations', email: 'karan.mehra@acme.corp', phone: '+91 98200 11015' },
  { id: 'emp-16', name: 'Tanvi Shah', dept: 'Operations', email: 'tanvi.shah@acme.corp', phone: '+91 98200 11016' },
  { id: 'emp-17', name: 'Siddharth Menon', dept: 'Operations', email: 'siddharth.menon@acme.corp', phone: '+91 98200 11017' },
  { id: 'emp-18', name: 'Neha Chawla', dept: 'Operations', email: 'neha.chawla@acme.corp', phone: '+91 98200 11018' },

  // Finance (4)
  { id: 'emp-19', name: 'Deepak Singhal', dept: 'Finance', email: 'deepak.singhal@acme.corp', phone: '+91 98200 11019' },
  { id: 'emp-20', name: 'Priyanka Bose', dept: 'Finance', email: 'priyanka.bose@acme.corp', phone: '+91 98200 11020' },
  { id: 'emp-21', name: 'Manish Pandey', dept: 'Finance', email: 'manish.pandey@acme.corp', phone: '+91 98200 11021' },
  { id: 'emp-22', name: 'Aditi Deshmukh', dept: 'Finance', email: 'aditi.deshmukh@acme.corp', phone: '+91 98200 11022' },

  // Legal (3)
  { id: 'emp-23', name: 'Naveen Chopra', dept: 'Legal', email: 'naveen.chopra@acme.corp', phone: '+91 98200 11023' },
  { id: 'emp-24', name: 'Shweta Bhatia', dept: 'Legal', email: 'shweta.bhatia@acme.corp', phone: '+91 98200 11024' },
  { id: 'emp-25', name: 'Gaurav Aggarwal', dept: 'Legal', email: 'gaurav.aggarwal@acme.corp', phone: '+91 98200 11025' },
]

export interface SeedData {
  employees: Employee[]
  settings: Settings
  visitors: Visitor[]
  visits: Visit[]
}

const FIRST_NAMES = [
  'Aaditya', 'Ishaan', 'Kabir', 'Reyansh', 'Aryan', 'Dhruv', 'Vihaan', 'Sai', 'Krishna', 'Shaurya',
  'Ananya', 'Aadhya', 'Saanvi', 'Myra', 'Ira', 'Prisha', 'Riya', 'Avni', 'Kiara', 'Tara',
]
const LAST_NAMES = [
  'Kapoor', 'Mehta', 'Nambiar', 'Ghosh', 'Chatterjee', 'Banerjee', 'Pillai', 'Reddy', 'Choudhury', 'Jain',
  'Mishra', 'Saxena', 'Trivedi', 'Thakur', 'Bhat', 'Dutta', 'Hegde', 'Kamat', 'Bhardwaj', 'Naidu',
]
const COMPANIES = [
  'Tata Consultancy Services', 'Infosys', 'Wipro', 'Reliance Industries', 'HDFC Bank',
  'Larsen & Toubro', 'Mahindra Tech', 'Godrej', 'Zomato', 'Swiggy', 'Razorpay', 'Flipkart',
]

/** Generates the default dataset with 25 employees and ~300 visits in mixed statuses. */
export function seedDefault(relativeDate: Date = new Date()): SeedData {
  const visitors: Visitor[] = []
  const visits: Visit[] = []

  const nowMs = relativeDate.getTime()
  const MS_HR = 3_600_000
  const MS_DAY = 86_400_000

  // 300 target:
  // 100 CHECKED_OUT (past 1-14 days)
  // 40 EXPIRED (past 1-7 days)
  // 20 OVERSTAY (checked in, window ended earlier today: effectiveStatus === 'OVERSTAY')
  // 30 CHECKED_IN (checked in today, window currently active)
  // 45 PRE_APPROVED (upcoming invites today and next 5 days)
  // 25 APPROVED (walk-ins approved today, awaiting check-in)
  // 20 PENDING (walk-ins awaiting approval today)
  // 20 REJECTED (walk-ins rejected)
  // Total = 300

  interface PlanItem {
    status: Status
    count: number
    kind: 'WALK_IN' | 'INVITE'
    timeCategory: 'past_days' | 'past_today' | 'current' | 'future'
  }

  const distribution: PlanItem[] = [
    { status: 'CHECKED_OUT', count: 100, kind: 'INVITE', timeCategory: 'past_days' },
    { status: 'EXPIRED', count: 40, kind: 'INVITE', timeCategory: 'past_days' },
    { status: 'CHECKED_IN', count: 20, kind: 'WALK_IN', timeCategory: 'past_today' }, // overstay: window ended
    { status: 'CHECKED_IN', count: 30, kind: 'INVITE', timeCategory: 'current' }, // actively inside window
    { status: 'PRE_APPROVED', count: 45, kind: 'INVITE', timeCategory: 'future' },
    { status: 'APPROVED', count: 25, kind: 'WALK_IN', timeCategory: 'current' },
    { status: 'PENDING', count: 20, kind: 'WALK_IN', timeCategory: 'current' },
    { status: 'REJECTED', count: 20, kind: 'WALK_IN', timeCategory: 'past_today' },
  ]

  let visitCounter = 1

  for (const item of distribution) {
    for (let i = 0; i < item.count; i++) {
      const vid = `vis-${String(visitCounter).padStart(3, '0')}`
      const visitorId = `vtr-${String(visitCounter).padStart(3, '0')}`
      const firstName = FIRST_NAMES[(visitCounter * 7 + i) % FIRST_NAMES.length]
      const lastName = LAST_NAMES[(visitCounter * 11 + i) % LAST_NAMES.length]
      const company = COMPANIES[(visitCounter + i) % COMPANIES.length]
      const host = SEED_EMPLOYEES[(visitCounter + i) % SEED_EMPLOYEES.length]
      const office = DEFAULT_SETTINGS.offices[(visitCounter + i) % DEFAULT_SETTINGS.offices.length]
      const type = DEFAULT_SETTINGS.visitTypes[(visitCounter + i) % DEFAULT_SETTINGS.visitTypes.length]

      const visitor: Visitor = {
        id: visitorId,
        name: `${firstName} ${lastName}`,
        phone: `+91 98${String(10000000 + visitCounter).slice(1)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        company,
      }
      visitors.push(visitor)

      let windowStartMs: number
      let windowEndMs: number
      let createdAtMs: number
      let checkInMs: number | undefined
      let checkOutMs: number | undefined

      if (item.timeCategory === 'past_days') {
        const daysAgo = 1 + (i % 14)
        windowStartMs = nowMs - daysAgo * MS_DAY + 10 * MS_HR
        windowEndMs = windowStartMs + 2 * MS_HR
        createdAtMs = windowStartMs - MS_DAY
        if (item.status === 'CHECKED_OUT') {
          checkInMs = windowStartMs + 5 * 60_000
          checkOutMs = windowEndMs - 10 * 60_000
        }
      } else if (item.timeCategory === 'past_today') {
        // window started 4 hours ago, ended 1 hour ago (triggers OVERSTAY for CHECKED_IN)
        windowStartMs = nowMs - 4 * MS_HR
        windowEndMs = nowMs - 1 * MS_HR
        createdAtMs = windowStartMs - 2 * MS_HR
        if (item.status === 'CHECKED_IN') {
          checkInMs = windowStartMs + 10 * 60_000
        }
      } else if (item.timeCategory === 'current') {
        // active window: started 1 hour ago, ends in 2 hours
        windowStartMs = nowMs - 1 * MS_HR
        windowEndMs = nowMs + 2 * MS_HR
        createdAtMs = nowMs - 3 * MS_HR
        if (item.status === 'CHECKED_IN') {
          checkInMs = windowStartMs + 15 * 60_000
        }
      } else {
        // future: starting 1 to 5 days ahead
        const daysAhead = 1 + (i % 5)
        windowStartMs = nowMs + daysAhead * MS_DAY + 10 * MS_HR
        windowEndMs = windowStartMs + 3 * MS_HR
        createdAtMs = nowMs - 2 * MS_HR
      }

      // Generate a distinct 6-character uppercase passCode for passes
      const hasPass =
        item.status === 'APPROVED' ||
        item.status === 'PRE_APPROVED' ||
        item.status === 'CHECKED_IN' ||
        item.status === 'CHECKED_OUT' ||
        item.status === 'EXPIRED'

      const passCode = hasPass ? `P${String(visitCounter).padStart(5, '0')}` : undefined

      const visit: Visit = {
        id: vid,
        visitorId,
        hostId: host.id,
        kind: item.kind,
        purpose: `${type} with ${host.name.split(' ')[0]}`,
        type,
        office,
        title: `${type} Visit`,
        windowStart: new Date(windowStartMs).toISOString(),
        windowEnd: new Date(windowEndMs).toISOString(),
        status: item.status,
        passCode,
        checkIn: checkInMs ? new Date(checkInMs).toISOString() : undefined,
        checkOut: checkOutMs ? new Date(checkOutMs).toISOString() : undefined,
        createdAt: new Date(createdAtMs).toISOString(),
      }

      visits.push(visit)
      visitCounter++
    }
  }

  return {
    employees: [...SEED_EMPLOYEES],
    settings: { ...DEFAULT_SETTINGS },
    visitors,
    visits,
  }
}

/** Generates N visits fast in-memory only (without localStorage persistence). */
export function seedLarge(n: number, relativeDate: Date = new Date()): SeedData {
  const visitors: Visitor[] = new Array(n)
  const visits: Visit[] = new Array(n)
  const nowMs = relativeDate.getTime()
  const MS_DAY = 86_400_000
  const MS_HR = 3_600_000

  for (let i = 0; i < n; i++) {
    const vid = `lrg-vis-${i}`
    const vtrId = `lrg-vtr-${i}`
    const host = SEED_EMPLOYEES[i % SEED_EMPLOYEES.length]
    const office = DEFAULT_SETTINGS.offices[i % DEFAULT_SETTINGS.offices.length]
    const type = DEFAULT_SETTINGS.visitTypes[i % DEFAULT_SETTINGS.visitTypes.length]

    visitors[i] = {
      id: vtrId,
      name: `Visitor ${i}`,
      phone: `+91 99000${String(i).padStart(5, '0')}`,
      email: `visitor${i}@example.com`,
      company: `Corp ${i % 50}`,
    }

    const windowStartMs = nowMs + (i % 5) * MS_DAY + 9 * MS_HR
    const windowEndMs = windowStartMs + 2 * MS_HR

    visits[i] = {
      id: vid,
      visitorId: vtrId,
      hostId: host.id,
      kind: 'INVITE',
      purpose: `Large Batch Meeting ${i}`,
      type,
      office,
      windowStart: new Date(windowStartMs).toISOString(),
      windowEnd: new Date(windowEndMs).toISOString(),
      status: 'PRE_APPROVED',
      passCode: `LRG${String(i).padStart(6, '0')}`,
      createdAt: new Date(nowMs).toISOString(),
    }
  }

  return {
    employees: [...SEED_EMPLOYEES],
    settings: { ...DEFAULT_SETTINGS },
    visitors,
    visits,
  }
}
