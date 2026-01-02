# MVP Routes & Internal Links - Quick Reference

**8 Pages to Build. Exact routes. Exact links. No confusion.**

---

## 🗺️ COMPLETE ROUTE MAP

```
┌─────────────────────────────────────────────────────────────────┐
│                            ROUTE MAP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  / (Home)                                                        │
│  ├─ /product                                                     │
│  ├─ /features                                                    │
│  │  ├─ /features/time-tracking                                  │
│  │  ├─ /features/employee-monitoring                            │
│  │  └─ /features/timesheets                                     │
│  ├─ /pricing                                                     │
│  └─ /signup                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**That's it. 8 routes total.**

---

## 📄 INTERNAL LINKS PER PAGE

### 1. HOME (`/`)

**Status:** ✅ Exists (needs link updates)

**Links OUT:**
```jsx
// Hero Section
<Link to="/signup">Start Free Trial</Link>
<Link to="/product">See How It Works</Link>

// Features Preview
<Link to="/features/time-tracking">automatic time tracking</Link>
<Link to="/features/employee-monitoring">employee monitoring</Link>
<Link to="/features/timesheets">automated timesheets</Link>
<Link to="/features">View All Features →</Link>

// Pricing Teaser
<Link to="/pricing">View Pricing Plans</Link>

// Final CTA
<Link to="/signup">Start Your 14-Day Free Trial</Link>
```

**Total links: 8**

---

### 2. PRODUCT (`/product`)

**Status:** 🔄 Needs to be created

**Links OUT:**
```jsx
// Breadcrumb
<Link to="/">Home</Link>

// Core Features Section
<Link to="/features/time-tracking">Automatic time tracking</Link>
<Link to="/features/employee-monitoring">Monitor your remote team</Link>
<Link to="/features/timesheets">Generate online timesheets</Link>

// All Features
<Link to="/features">View All Features →</Link>

// Pricing
<Link to="/pricing">See Pricing Plans</Link>

// CTA
<Link to="/signup">Start Free Trial</Link>
```

**Total links: 8**

---

### 3. FEATURES HUB (`/features`)

**Status:** ✅ Exists (needs link updates)

**Links OUT:**
```jsx
// Breadcrumb
<Link to="/">Home</Link>

// Feature Cards (with full card as link)
<Link to="/features/time-tracking">
  <Card>
    <h3>Time Tracking</h3>
    <p>Automatic time tracking with screenshots...</p>
    <span>Learn more →</span>
  </Card>
</Link>

<Link to="/features/employee-monitoring">
  <Card>
    <h3>Employee Monitoring</h3>
    <p>Monitor productivity and activity...</p>
    <span>Learn more →</span>
  </Card>
</Link>

<Link to="/features/timesheets">
  <Card>
    <h3>Timesheets</h3>
    <p>Automated timesheet generation...</p>
    <span>Learn more →</span>
  </Card>
</Link>

// Pricing
<Link to="/pricing">Compare Plans →</Link>

// CTA
<Link to="/signup">Start Free Trial</Link>
```

**Total links: 6**

---

### 4. TIME TRACKING (`/features/time-tracking`)

**Status:** ✅ Exists (already perfect - use as template)

**Links OUT:**
```jsx
// Breadcrumb
<Link to="/">Home</Link>
<Link to="/features">Features</Link>

// In Body Content (naturally woven in)
Our <Link to="/features/time-tracking">automatic time tracking</Link>
works seamlessly with <Link to="/features/employee-monitoring">employee monitoring</Link>
to give you complete visibility. Combine it with
<Link to="/features/timesheets">automated timesheets</Link> for easy payroll.

// Related Features Section (cards)
<Link to="/features/employee-monitoring">
  <h3>Employee Monitoring</h3>
  <p>Complete monitoring suite</p>
  <span>Learn more →</span>
</Link>

<Link to="/features/timesheets">
  <h3>Timesheets & Approvals</h3>
  <p>Automated timesheet generation</p>
  <span>Learn more →</span>
</Link>

// Pricing
<Link to="/pricing">View Pricing</Link>

// CTA
<Link to="/signup">Start Free Trial</Link>
```

**Total links: 9**

---

### 5. EMPLOYEE MONITORING (`/features/employee-monitoring`)

**Status:** 🔄 Needs to be created (copy TimeTracking.jsx)

**Links OUT:**
```jsx
// Breadcrumb
<Link to="/">Home</Link>
<Link to="/features">Features</Link>

// In Body Content
Our <Link to="/features/employee-monitoring">employee monitoring software</Link>
includes <Link to="/features/time-tracking">automatic time tracking</Link>,
screenshots, and activity tracking. Generate
<Link to="/features/timesheets">automatic timesheets</Link> from tracked data.

// Related Features Section
<Link to="/features/time-tracking">
  <h3>Time Tracking</h3>
  <p>Automatic time tracking with screenshots</p>
  <span>Learn more →</span>
</Link>

<Link to="/features/timesheets">
  <h3>Timesheets & Approvals</h3>
  <p>Automated timesheet generation</p>
  <span>Learn more →</span>
</Link>

// Pricing
<Link to="/pricing">View Pricing</Link>

// CTA
<Link to="/signup">Start Free Trial</Link>
```

**Total links: 8**

---

### 6. TIMESHEETS (`/features/timesheets`)

**Status:** 🔄 Needs to be created (copy TimeTracking.jsx)

**Links OUT:**
```jsx
// Breadcrumb
<Link to="/">Home</Link>
<Link to="/features">Features</Link>

// In Body Content
Generate <Link to="/features/timesheets">online timesheets</Link> automatically
from <Link to="/features/time-tracking">tracked time</Link>. Combine with
<Link to="/features/employee-monitoring">employee monitoring</Link> for complete accuracy.

// Related Features Section
<Link to="/features/time-tracking">
  <h3>Time Tracking</h3>
  <p>Automatic time tracking with screenshots</p>
  <span>Learn more →</span>
</Link>

<Link to="/features/employee-monitoring">
  <h3>Employee Monitoring</h3>
  <p>Complete monitoring suite</p>
  <span>Learn more →</span>
</Link>

// Pricing
<Link to="/pricing">View Pricing</Link>

// CTA
<Link to="/signup">Start Free Trial</Link>
```

**Total links: 8**

---

### 7. PRICING (`/pricing`)

**Status:** ✅ Exists (needs link updates)

**Links OUT:**
```jsx
// Breadcrumb
<Link to="/">Home</Link>

// In Plan Cards (multiple mentions)
Includes <Link to="/features/time-tracking">time tracking</Link>,
<Link to="/features/employee-monitoring">employee monitoring</Link>,
and <Link to="/features/timesheets">timesheets</Link>.

// See All Features
<Link to="/features">View All Features →</Link>

// CTA (multiple)
<Link to="/signup">Start Free Trial</Link>
```

**Total links: 6**

---

### 8. SIGNUP (`/signup`)

**Status:** ✅ Exists (needs minimal updates)

**Links OUT:**
```jsx
// Back to Home
<Link to="/">← Back to Home</Link>

// Optional Helper Links
<Link to="/pricing">View pricing plans</Link>
<Link to="/features">Check features</Link>
```

**Total links: 3**

---

## 📊 LINK MATRIX

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Home | Product | 1 | "See how it works" |
| Home | Features Hub | 1 | "View all features" |
| Home | Time Tracking | 1 | "automatic time tracking" |
| Home | Employee Mon. | 1 | "employee monitoring" |
| Home | Timesheets | 1 | "automated timesheets" |
| Home | Pricing | 1 | "View pricing plans" |
| Home | Signup | 2 | "Start free trial" |
| **TOTAL** | | **8** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Product | Home | 1 | Breadcrumb |
| Product | Time Tracking | 1 | "Automatic time tracking" |
| Product | Employee Mon. | 1 | "Monitor your team" |
| Product | Timesheets | 1 | "Generate timesheets" |
| Product | Features Hub | 1 | "View all features" |
| Product | Pricing | 1 | "See pricing" |
| Product | Signup | 1 | "Start free trial" |
| **TOTAL** | | **8** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Features Hub | Home | 1 | Breadcrumb |
| Features Hub | Time Tracking | 1 | Card link |
| Features Hub | Employee Mon. | 1 | Card link |
| Features Hub | Timesheets | 1 | Card link |
| Features Hub | Pricing | 1 | "Compare plans" |
| Features Hub | Signup | 1 | "Start free trial" |
| **TOTAL** | | **6** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Time Tracking | Home | 1 | Breadcrumb |
| Time Tracking | Features Hub | 1 | Breadcrumb |
| Time Tracking | Employee Mon. | 2 | Body text + card |
| Time Tracking | Timesheets | 2 | Body text + card |
| Time Tracking | Pricing | 1 | "View pricing" |
| Time Tracking | Signup | 1 | "Start free trial" |
| **TOTAL** | | **9** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Employee Mon. | Home | 1 | Breadcrumb |
| Employee Mon. | Features Hub | 1 | Breadcrumb |
| Employee Mon. | Time Tracking | 2 | Body text + card |
| Employee Mon. | Timesheets | 2 | Body text + card |
| Employee Mon. | Pricing | 1 | "View pricing" |
| Employee Mon. | Signup | 1 | "Start free trial" |
| **TOTAL** | | **8** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Timesheets | Home | 1 | Breadcrumb |
| Timesheets | Features Hub | 1 | Breadcrumb |
| Timesheets | Time Tracking | 2 | Body text + card |
| Timesheets | Employee Mon. | 2 | Body text + card |
| Timesheets | Pricing | 1 | "View pricing" |
| Timesheets | Signup | 1 | "Start free trial" |
| **TOTAL** | | **8** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Pricing | Home | 1 | Breadcrumb |
| Pricing | Time Tracking | 1 | In plan details |
| Pricing | Employee Mon. | 1 | In plan details |
| Pricing | Timesheets | 1 | In plan details |
| Pricing | Features Hub | 1 | "View all features" |
| Pricing | Signup | 1 | "Start free trial" |
| **TOTAL** | | **6** | |

| From Page | To Page | Count | Anchor Text Examples |
|-----------|---------|-------|---------------------|
| Signup | Home | 1 | "Back to home" |
| Signup | Pricing | 1 | "View pricing" |
| Signup | Features Hub | 1 | "Check features" |
| **TOTAL** | | **3** | |

---

## 📈 LINK FLOW ANALYSIS

### Pages Receiving Most Links (Authority Pages):
1. **Signup** - 7 incoming links ⭐
2. **Features Hub** - 6 incoming links
3. **Pricing** - 6 incoming links
4. **Time Tracking** - 5 incoming links
5. **Employee Monitoring** - 5 incoming links
6. **Timesheets** - 5 incoming links
7. **Home** - 4 incoming links
8. **Product** - 1 incoming link

**Perfect!** Authority flows to conversion pages (Signup, Pricing) and feature pages.

---

## ✅ BUILD CHECKLIST

### Pages to Create:
- [ ] `/product` (1.5 hours)
- [ ] `/features/employee-monitoring` (1 hour - copy template)
- [ ] `/features/timesheets` (1 hour - copy template)

### Pages to Update:
- [ ] `/` (Home) - Add 8 links (30 min)
- [ ] `/features` - Add 6 links (30 min)
- [ ] `/pricing` - Add 6 links (30 min)
- [ ] `/signup` - Add 3 links (15 min)

### Already Perfect:
- [x] `/features/time-tracking` ✅ (use as template)

**Total work: ~6 hours**

---

## 🎯 ANCHOR TEXT LIBRARY

### Copy & Paste These Exact Phrases:

**For Time Tracking:**
- automatic time tracking
- track employee hours
- time tracking software
- automatic time tracking software

**For Employee Monitoring:**
- employee monitoring
- monitor your remote team
- employee monitoring software
- productivity monitoring

**For Timesheets:**
- automated timesheets
- online timesheets
- generate timesheets
- automated timesheet generation

**For Features Hub:**
- view all features
- explore all features
- see all features
- explore features

**For Pricing:**
- view pricing
- see pricing plans
- compare plans
- view pricing plans

**For Signup:**
- start free trial
- start your free trial
- create account
- sign up free
- start your 14-day free trial

---

## 🚀 IMPLEMENTATION ORDER

### Day 1 (Monday):
1. Update Home page - add 8 links ✅
2. Create Product page - add 8 links ✅
3. Update Features hub - add 6 links ✅

### Day 2 (Tuesday):
1. Create Employee Monitoring page - add 8 links ✅
2. Create Timesheets page - add 8 links ✅
3. Update Pricing page - add 6 links ✅

### Day 3 (Wednesday):
1. Update Signup page - add 3 links ✅
2. Test all 56 total links ✅
3. QA all pages ✅

**Total: 3 days, 56 internal links, 8 pages, MVP ready! 🎉**

---

## 📊 TOTAL INTERNAL LINKS: 56

| Page | Outgoing Links | Incoming Links |
|------|----------------|----------------|
| Home | 8 | 4 |
| Product | 8 | 1 |
| Features Hub | 6 | 6 |
| Time Tracking | 9 | 5 |
| Employee Mon. | 8 | 5 |
| Timesheets | 8 | 5 |
| Pricing | 6 | 6 |
| Signup | 3 | 7 |
| **TOTAL** | **56** | **39** |

**Perfect internal linking structure!** ✅

---

## 💡 QUICK COPY-PASTE TEMPLATES

### Breadcrumb Component Usage:
```jsx
<Breadcrumbs items={[
  { name: 'Features', href: '/features' },
  { name: 'Time Tracking' }
]} />
```

### Related Features Section:
```jsx
<section className="bg-slate-50 py-20">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">Related Features</h2>
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Link to="/features/employee-monitoring">
        <Card className="h-full hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Employee Monitoring</h3>
            <p className="text-sm text-slate-600">Complete monitoring suite</p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              Learn more →
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/features/timesheets">
        <Card className="h-full hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Timesheets & Approvals</h3>
            <p className="text-sm text-slate-600">Automated timesheet generation</p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              Learn more →
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  </div>
</section>
```

---

**This is your complete internal linking blueprint for MVP launch. Every link mapped. Every anchor text defined. Zero confusion.** ✅

**Now go build! 🚀**
