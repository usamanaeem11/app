# Website Blueprint - Quick Reference Card

**📌 Print This and Keep It At Your Desk**

---

## 🎯 PAGE CREATION FORMULA

### 1. Copy Template
```bash
cp TimeTracking.jsx NewPage.jsx
```

### 2. Update Content
- Change title/description
- Update breadcrumbs
- Add sub-features (if hub page)
- Add related features (4 links)

### 3. Internal Links (REQUIRED)
- [ ] Link UP to parent
- [ ] Link SIDEWAYS to 3-4 related
- [ ] Link DOWN to children (if hub)
- [ ] Link to `/pricing`
- [ ] Link to `/signup`

### 4. Add Route
```jsx
// App.js
<Route path="/page-name" element={<PageName />} />
```

### 5. QA Checklist
- [ ] Mobile responsive
- [ ] Page load < 3s
- [ ] All links work
- [ ] Meta tags set
- [ ] Breadcrumbs working

---

## 🔗 INTERNAL LINKING RULES

### Feature Hub Page Must Link:
- UP: `/product`
- DOWN: All sub-features
- SIDEWAYS: 3-4 related features
- OUT: `/pricing`, `/signup`, `/integrations`

### Sub-Feature Page Must Link:
- UP: Parent feature + `/product`
- SIDEWAYS: 1-2 related sub-features
- OUT: `/pricing`, `/signup`

### Industry Page Must Link:
- FEATURES: 5-7 relevant features
- INTEGRATIONS: Industry-specific
- OUT: `/pricing`, `/signup`

### Tool Page Must Link:
- ABOVE FOLD: Soft CTA to feature
- MID-CONTENT: 2-3 features
- BOTTOM: Strong CTA to `/signup`

---

## 📐 URL STRUCTURE PATTERN

```
Feature Hub:        /feature-name
Sub-Feature:        /feature-name/sub-feature
Solution:           /solutions/solution-name
Industry:           /industries/industry-name
Integration:        /integrations/tool-name
Comparison:         /compare/competitor-name
Tool:               /tools/tool-name
Use Case:           /use-cases/case-name
```

**Rules:**
- Lowercase only
- Use hyphens (not underscores)
- Max 2 levels (rarely 3)
- Descriptive, not clever

---

## ✅ QA CHECKLIST (Every Page)

### Content
- [ ] H1 is unique
- [ ] Content 1,000+ words (feature pages)
- [ ] No spelling errors
- [ ] FAQ section included

### SEO
- [ ] Meta title < 60 chars
- [ ] Meta description < 155 chars
- [ ] Breadcrumbs present
- [ ] Images have alt text

### Links
- [ ] Min 4 internal links in body
- [ ] Related features section
- [ ] Link to pricing
- [ ] Link to signup
- [ ] No 404s

### Technical
- [ ] Page load < 3s
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Lighthouse > 90

### Conversion
- [ ] CTA above fold
- [ ] CTA at bottom
- [ ] Value prop clear

---

## 📊 LAUNCH PRIORITIES

### P0 - Launch Blockers (Week 1)
14 pages must be live:
- Home, Pricing, Signup, Login, Contact
- Product, Features
- Time Tracking, Employee Monitoring
- Timesheets, Payroll, Workforce
- Privacy, Terms

### P1 - Growth (Weeks 2-4)
35 pages:
- 10 sub-features
- 10 solutions/industries
- 15 integrations/tools

### P2 - Scale (Weeks 5-8)
80+ pages:
- Remaining features
- All comparisons
- All industries
- All tools

---

## 🎨 COMPONENT QUICK USE

### Layout Wrapper
```jsx
import MarketingLayout from '../../components/marketing/MarketingLayout';

export default function Page() {
  return (
    <MarketingLayout>
      {/* Your content */}
    </MarketingLayout>
  );
}
```

### Breadcrumbs
```jsx
import Breadcrumbs from '../../components/marketing/Breadcrumbs';

<Breadcrumbs items={[
  { name: 'Product', href: '/product' },
  { name: 'Time Tracking' }
]} />
```

### Internal Link (Good)
```jsx
<Link to="/employee-monitoring">
  employee monitoring software
</Link>
```

### Internal Link (Bad)
```jsx
<Link to="/employee-monitoring">
  click here
</Link>
```

---

## 📈 DAILY WORKFLOW

### Morning (30 min)
1. Pick page from priority list
2. Create file
3. Copy TimeTracking.jsx structure

### Build (90 min)
1. Update content from data file
2. Add internal links (min 8)
3. Add breadcrumbs
4. Add meta tags

### Test (30 min)
1. Test all links
2. Mobile responsive check
3. Page load test
4. Lighthouse audit

### Deploy (15 min)
1. Add route to App.js
2. Commit and push
3. Verify live
4. Update checklist

**Target: 2-3 pages per day**

---

## 🎯 ANCHOR TEXT EXAMPLES

### Good (Descriptive)
- "automatic time tracking software"
- "employee monitoring for remote teams"
- "GPS tracking with geofencing"
- "payroll automation system"

### Bad (Generic)
- "click here"
- "learn more"
- "read this"
- "see more"

---

## 🔥 COMMON MISTAKES TO AVOID

### DON'T:
❌ Create pages without internal links
❌ Use "click here" as anchor text
❌ Skip breadcrumbs
❌ Forget mobile testing
❌ Skip meta tags
❌ Link only to pricing/signup
❌ Use generic H1s
❌ Create orphan pages

### DO:
✅ Link to 4+ related pages
✅ Use descriptive anchor text
✅ Add breadcrumbs to every page
✅ Test on mobile first
✅ Set unique meta tags
✅ Balance product/conversion links
✅ Make H1 keyword-rich
✅ Ensure every page has incoming links

---

## 📞 WHERE TO FIND THINGS

### Strategy & Planning:
- `WEBSITE_BLUEPRINT.md` - Complete strategy
- `WEBSITE_IMPLEMENTATION_GUIDE.md` - Step-by-step

### Code Templates:
- `TimeTracking.jsx` - Feature page template
- `Header.jsx` - Navigation
- `Footer.jsx` - Footer with all links

### Data:
- `marketingPages.js` - Content for all pages

### Examples:
- Look at `TimeTracking.jsx` for perfect internal linking

---

## 🎓 KEY PRINCIPLES

### 1. Internal Linking
Every page needs incoming AND outgoing links. No orphans.

### 2. Descriptive Anchors
Tell users AND Google what they'll find. Be specific.

### 3. Mobile First
Test mobile before desktop. Most traffic is mobile.

### 4. Fast Load
< 3 seconds or users bounce. Optimize images.

### 5. Clear CTAs
Above fold + bottom. Make signup obvious.

---

## 💡 SUCCESS FORMULA

```
Good Template (TimeTracking.jsx)
  +
Clear Content (marketingPages.js)
  +
Proper Links (4+ internal, descriptive anchors)
  +
SEO Basics (meta tags, breadcrumbs, alt text)
  +
Mobile Testing (all breakpoints)
  =
WINNING PAGE ✅
```

---

## 🚀 SPEED TIPS

1. **Batch Similar Pages**
   - Do all 5 feature hubs in one session
   - Do all 10 sub-features next
   - Efficiency through repetition

2. **Use Find & Replace**
   - Copy TimeTracking.jsx
   - Find "Time Tracking" → Replace with "Employee Monitoring"
   - Update specific content
   - 30 minutes per page

3. **Test in Batches**
   - Build 3 pages
   - Test all 3 together
   - Fix issues
   - Deploy batch

4. **Lighthouse Once Daily**
   - Test first page thoroughly
   - If it scores 90+, others will too
   - Fix systemic issues once

---

## 📊 TARGET METRICS

### Week 1 (P0 Launch)
- 14 pages live
- 100+ internal links
- Page load < 3s
- Mobile score > 90

### Month 1 (P1 Complete)
- 49 pages live
- 500+ internal links
- 1,000 organic sessions
- 10 trial signups

### Month 3 (P2 Complete)
- 120+ pages live
- 1,500+ internal links
- 10,000 organic sessions
- 100 trial signups/mo
- 50 keywords in top 10

---

## ⚡ ONE-LINER REMINDERS

- **Breadcrumbs = SEO gold** (add to every page)
- **Links flow upward** (give authority to money pages)
- **Mobile first, always** (most users are mobile)
- **CTA above fold** (don't make them scroll)
- **Descriptive anchors** (tell them what they'll get)
- **No orphan pages** (everything needs incoming links)
- **Fast or bounce** (< 3 seconds load time)
- **Test before deploy** (broken links = bad UX)

---

## 🎯 WHEN IN DOUBT

1. Look at `TimeTracking.jsx`
2. Check `WEBSITE_BLUEPRINT.md`
3. Follow this card
4. Test thoroughly

---

**📌 Keep this card handy. It has everything you need for daily work.** ✅

**Questions? Read the blueprint documents.**

**Now go build! 🚀**
