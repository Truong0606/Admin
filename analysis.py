import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

f = r'c:\Users\TRUONG\OneDrive\Desktop\adminpage\Analytics-Dataset.xlsx'
out = Path(r'c:\Users\TRUONG\OneDrive\Desktop\adminpage\analysis_output')
out.mkdir(exist_ok=True)

# ============================================================
# 1. SITE VISITS - DAILY TRENDS
# ============================================================
visits = pd.read_excel(f, sheet_name='Site Visits')
print("=== SITE VISITS (Daily Sessions) ===")
print(f"Total rows: {len(visits)}")
nz = visits[visits['Sessions'] > 0].copy()
print(f"Days with activity: {len(nz)}")
if len(nz) > 0:
    print(f"Date range: {nz['Day Index'].min()} to {nz['Day Index'].max()}")
    print(f"Mean daily sessions: {nz['Sessions'].mean():.1f}")
    print(f"Median: {nz['Sessions'].median():.1f}")
    print(f"Max: {nz['Sessions'].max():.0f}")
    print(f"Min (non-zero): {nz['Sessions'].min():.0f}")
    print(f"Std dev: {nz['Sessions'].std():.1f}")
    print(f"Total sessions: {nz['Sessions'].sum():.0f}")

# Weekly aggregation
nz['Day Index'] = pd.to_datetime(nz['Day Index'])
nz['Week'] = nz['Day Index'].dt.isocalendar().week.values.astype(float).astype(int)
weekly = nz.groupby('Week')['Sessions'].agg(['sum', 'mean', 'count'])
print("\nWeekly aggregation:")
print(weekly.to_string())

# Plot daily sessions
fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(nz['Day Index'], nz['Sessions'], linewidth=1, color='#2196F3')
ax.fill_between(nz['Day Index'], nz['Sessions'], alpha=0.2, color='#2196F3')
ax.set_title('Daily Sessions Over Time (Jun-Oct 2017)', fontsize=14, fontweight='bold')
ax.set_xlabel('Date')
ax.set_ylabel('Sessions')
ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(out / 'daily_sessions.png', dpi=150)
plt.close()
print("\nSaved: daily_sessions.png")

# ============================================================
# 2. INDIVIDUAL USER DATA - STATISTICAL ANALYSIS
# ============================================================
users = pd.read_excel(f, sheet_name='Individual User Data')
print("\n=== INDIVIDUAL USER DATA ===")
print(f"Total users: {len(users)}")
print(f"\nSessions per user:")
print(users['Sessions'].describe())
print(f"\nAvg Session Duration (seconds):")
print(users['Avg. Session Duration (seconds)'].describe())
print(f"\nBounce Rate:")
print(users['Bounce Rate'].describe())
print(f"\nGoal Conversion Rate:")
print(users['Goal Conversion Rate'].describe())

# Users with zero session duration (bounced immediately)
zero_dur = (users['Avg. Session Duration (seconds)'] == 0).sum()
print(f"\nUsers with 0 avg session duration: {zero_dur} ({zero_dur/len(users)*100:.1f}%)")

# Users with 100% bounce rate
full_bounce = (users['Bounce Rate'] == 1.0).sum()
print(f"Users with 100% bounce rate: {full_bounce} ({full_bounce/len(users)*100:.1f}%)")

# Users with any conversions
converters = (users['Goal Conversion Rate'] > 0).sum()
print(f"Users with any goal conversions: {converters} ({converters/len(users)*100:.1f}%)")

# Session distribution histogram
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

ax = axes[0, 0]
sessions_capped = users['Sessions'].clip(upper=20)
ax.hist(sessions_capped, bins=20, color='#4CAF50', edgecolor='white', alpha=0.8)
ax.set_title('Sessions per User (capped at 20)', fontweight='bold')
ax.set_xlabel('Number of Sessions')
ax.set_ylabel('Users')

ax = axes[0, 1]
ax.hist(users['Bounce Rate'], bins=20, color='#FF5722', edgecolor='white', alpha=0.8)
ax.set_title('Bounce Rate Distribution', fontweight='bold')
ax.set_xlabel('Bounce Rate')
ax.set_ylabel('Users')

ax = axes[1, 0]
dur = users['Avg. Session Duration (seconds)'][users['Avg. Session Duration (seconds)'] > 0]
dur_capped = dur.clip(upper=1200)
ax.hist(dur_capped, bins=30, color='#9C27B0', edgecolor='white', alpha=0.8)
ax.set_title('Avg Session Duration (>0, capped 1200s)', fontweight='bold')
ax.set_xlabel('Duration (seconds)')
ax.set_ylabel('Users')

ax = axes[1, 1]
conv = users['Goal Conversion Rate'][users['Goal Conversion Rate'] > 0]
ax.hist(conv, bins=30, color='#FF9800', edgecolor='white', alpha=0.8)
ax.set_title('Goal Conversion Rate (>0 only)', fontweight='bold')
ax.set_xlabel('Conversion Rate')
ax.set_ylabel('Users')

plt.tight_layout()
plt.savefig(out / 'user_distributions.png', dpi=150)
plt.close()
print("Saved: user_distributions.png")

# ============================================================
# 3. ENGAGEMENT - Session Duration Buckets
# ============================================================
eng = pd.read_excel(f, sheet_name='Engagement', usecols=[0, 1, 2])
eng.columns = ['Duration_Bucket', 'Sessions', 'Pageviews']
eng = eng.dropna(subset=['Duration_Bucket'])
print("\n=== ENGAGEMENT ===")
print(eng.to_string(index=False))
eng['Pages_Per_Session'] = eng['Pageviews'] / eng['Sessions']
print("\nPages per session by bucket:")
print(eng[['Duration_Bucket', 'Pages_Per_Session']].to_string(index=False))

fig, ax = plt.subplots(figsize=(10, 5))
x = range(len(eng))
bars = ax.bar(x, eng['Sessions'], color='#3F51B5', alpha=0.8, label='Sessions')
ax2 = ax.twinx()
ax2.plot(x, eng['Pages_Per_Session'], 'o-', color='#F44336', linewidth=2, label='Pages/Session')
ax.set_xticks(x)
ax.set_xticklabels(eng['Duration_Bucket'], rotation=45, ha='right')
ax.set_ylabel('Sessions', color='#3F51B5')
ax2.set_ylabel('Pages per Session', color='#F44336')
ax.set_title('Engagement: Sessions & Pages/Session by Duration', fontweight='bold')
ax.legend(loc='upper left')
ax2.legend(loc='upper right')
plt.tight_layout()
plt.savefig(out / 'engagement.png', dpi=150)
plt.close()
print("Saved: engagement.png")

# ============================================================
# 4. ACQUISITION SOURCE
# ============================================================
acq = pd.read_excel(f, sheet_name='Acquisition Source')
acq = acq.dropna(subset=['Default Channel Grouping'])
print("\n=== ACQUISITION SOURCE ===")
print(acq.to_string(index=False))

fig, axes = plt.subplots(1, 3, figsize=(16, 5))
channels = acq['Default Channel Grouping'].tolist()
sessions = acq['Sessions'].tolist()

ax = axes[0]
colors = ['#2196F3', '#4CAF50', '#FF9800', '#F44336']
ax.pie(sessions, labels=channels, autopct='%1.1f%%', colors=colors, startangle=90)
ax.set_title('Traffic by Channel', fontweight='bold')

ax = axes[1]
ax.barh(channels, acq['Bounce Rate'], color=colors)
ax.set_title('Bounce Rate by Channel', fontweight='bold')
ax.set_xlabel('Bounce Rate')

ax = axes[2]
ax.barh(channels, acq['Avg. Session Duration'], color=colors)
ax.set_title('Avg Session Duration by Channel', fontweight='bold')
ax.set_xlabel('Duration (seconds)')

plt.tight_layout()
plt.savefig(out / 'acquisition.png', dpi=150)
plt.close()
print("Saved: acquisition.png")

# ============================================================
# 5. AGE & GENDER DEMOGRAPHICS
# ============================================================
age = pd.read_excel(f, sheet_name='Age', usecols=range(10), nrows=7)
age.columns = ['Age', 'Sessions', 'Pct_New', 'New_Users', 'Bounce_Rate', 'Pages_Session', 'Avg_Duration', 'Conversion_Rate', 'Completions', 'Value']
age = age.dropna(subset=['Age'])
age['Sessions'] = pd.to_numeric(age['Sessions'], errors='coerce')
print("\n=== AGE ===")
print(age.to_string(index=False))

gender = pd.read_excel(f, sheet_name='Gender', usecols=range(10), nrows=3)
gender.columns = ['Gender', 'Sessions', 'Pct_New', 'New_Users', 'Bounce_Rate', 'Pages_Session', 'Avg_Duration', 'Conversion_Rate', 'Completions', 'Value']
gender = gender.dropna(subset=['Gender'])
gender['Sessions'] = pd.to_numeric(gender['Sessions'], errors='coerce')
print("\n=== GENDER ===")
print(gender.to_string(index=False))

fig, axes = plt.subplots(1, 3, figsize=(16, 5))

ax = axes[0]
age_sorted = age.sort_values('Sessions', ascending=True)
ax.barh(age_sorted['Age'], age_sorted['Sessions'], color='#009688')
ax.set_title('Sessions by Age Group', fontweight='bold')
ax.set_xlabel('Sessions')

ax = axes[1]
ax.barh(age_sorted['Age'], age_sorted['Conversion_Rate'], color='#E91E63')
ax.set_title('Goal Conversion Rate by Age', fontweight='bold')
ax.set_xlabel('Conversion Rate')

ax = axes[2]
genders = gender[gender['Gender'].isin(['female', 'male'])]
ax.bar(genders['Gender'], genders['Sessions'], color=['#E91E63', '#2196F3'])
ax.set_title('Sessions by Gender', fontweight='bold')
ax.set_ylabel('Sessions')

plt.tight_layout()
plt.savefig(out / 'demographics.png', dpi=150)
plt.close()
print("Saved: demographics.png")

# ============================================================
# 6. PAGE VIEWS & LANDING/EXIT PAGES
# ============================================================
pages = pd.read_excel(f, sheet_name='Page Views', usecols=range(8))
pages = pages.dropna(subset=['Page'])
print("\n=== PAGE VIEWS ===")
print(pages.to_string(index=False))

landing = pd.read_excel(f, sheet_name='Landing Pages', usecols=range(10))
landing = landing.dropna(subset=['Landing Page'])
print("\n=== LANDING PAGES ===")
print(landing.to_string(index=False))

exits = pd.read_excel(f, sheet_name='Exit Pages')
exits = exits.dropna(subset=['Page'])
print("\n=== EXIT PAGES ===")
print(exits.to_string(index=False))

fig, axes = plt.subplots(1, 3, figsize=(18, 6))

ax = axes[0]
pv_sorted = pages.sort_values('Pageviews', ascending=True)
short_names = [p.split('/')[-2] if len(p.split('/')) > 2 else p for p in pv_sorted['Page']]
ax.barh(short_names, pv_sorted['Pageviews'], color='#673AB7')
ax.set_title('Pageviews by Page', fontweight='bold')
ax.set_xlabel('Pageviews')

ax = axes[1]
land_sorted = landing.sort_values('Sessions', ascending=True)
short_land = [p.split('/')[-2] if len(p.split('/')) > 2 else p for p in land_sorted['Landing Page']]
ax.barh(short_land, land_sorted['Sessions'], color='#4CAF50')
ax.set_title('Landing Page Sessions', fontweight='bold')
ax.set_xlabel('Sessions')

ax = axes[2]
exit_sorted = exits.sort_values('Exits', ascending=True)
short_exit = [p.split('/')[-2] if len(p.split('/')) > 2 else p for p in exit_sorted['Page']]
ax.barh(short_exit, exit_sorted['Exits'], color='#F44336')
ax.set_title('Exit Page Count', fontweight='bold')
ax.set_xlabel('Exits')

plt.tight_layout()
plt.savefig(out / 'pages_analysis.png', dpi=150)
plt.close()
print("Saved: pages_analysis.png")

# ============================================================
# 7. NEW vs RETURNING
# ============================================================
nvr = pd.read_excel(f, sheet_name='New vs. Returning')
# First two columns are daily data, cols D-M are aggregate
print("\n=== NEW vs RETURNING (Aggregate) ===")
# The aggregate data is in row 1 (Returning) and row 2 (New)
nvr_agg = pd.read_excel(f, sheet_name='New vs. Returning', usecols=[3,4,5,6,7,8,9,10,11,12])
nvr_agg.columns = ['User Type', 'Sessions', 'Pct_New', 'New_Users', 'Bounce_Rate', 'Pages_Session', 'Avg_Duration', 'Conversion_Rate', 'Completions', 'Value']
nvr_agg = nvr_agg.dropna(subset=['User Type'])
print(nvr_agg.to_string(index=False))

# Daily time series
daily = pd.read_excel(f, sheet_name='New vs. Returning', usecols=[0,1])
daily.columns = ['Date', 'Sessions']
daily['Date'] = pd.to_datetime(daily['Date'])
daily_nz = daily[daily['Sessions'] > 0].copy()
print(f"\nDaily data (New vs Returning sheet, non-zero): {len(daily_nz)} days")
if len(daily_nz) > 0:
    print(daily_nz.head(10).to_string(index=False))

# ============================================================
# 8. FREQUENCY AND RECENCY
# ============================================================
freq = pd.read_excel(f, sheet_name='Frequency and Recency', usecols=[0,1,2])
freq.columns = ['Session_Count', 'Sessions', 'Pageviews']
freq = freq.dropna(subset=['Sessions'])
print("\n=== FREQUENCY AND RECENCY ===")
print(freq.to_string(index=False))

fig, ax = plt.subplots(figsize=(10, 5))
x = range(len(freq))
ax.bar(x, freq['Sessions'], color='#00BCD4', alpha=0.8, label='Sessions')
ax2 = ax.twinx()
ax2.bar([i+0.3 for i in x], freq['Pageviews'], color='#FFC107', alpha=0.6, width=0.3, label='Pageviews')
ax.set_xticks(x)
ax.set_xticklabels(freq['Session_Count'])
ax.set_xlabel('Number of Sessions (Visit Count)')
ax.set_ylabel('Sessions', color='#00BCD4')
ax2.set_ylabel('Pageviews', color='#FFC107')
ax.set_title('Frequency: Sessions and Pageviews by Visit Count', fontweight='bold')
ax.legend(loc='upper left')
ax2.legend(loc='upper right')
plt.tight_layout()
plt.savefig(out / 'frequency.png', dpi=150)
plt.close()
print("Saved: frequency.png")

# ============================================================
# 9. BROWSER & MOBILE
# ============================================================
browser = pd.read_excel(f, sheet_name='Browser')
browser = browser.dropna(subset=['Browser'])
print("\n=== BROWSER ===")
print(browser.to_string(index=False))

mobile = pd.read_excel(f, sheet_name='Mobile Device Usage', usecols=range(10))
mobile = mobile.dropna(subset=['Mobile Device Info'])
print("\n=== MOBILE DEVICE USAGE ===")
print(mobile.to_string(index=False))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax = axes[0]
b_sorted = browser.sort_values('Sessions', ascending=True)
ax.barh(b_sorted['Browser'], b_sorted['Sessions'], color='#795548')
ax.set_title('Sessions by Browser', fontweight='bold')
ax.set_xlabel('Sessions')

ax = axes[1]
m_sorted = mobile.sort_values('Sessions', ascending=True).tail(6)
short_mob = [str(d)[:25] for d in m_sorted['Mobile Device Info']]
ax.barh(short_mob, m_sorted['Sessions'], color='#607D8B')
ax.set_title('Sessions by Mobile Device', fontweight='bold')
ax.set_xlabel('Sessions')

plt.tight_layout()
plt.savefig(out / 'browser_mobile.png', dpi=150)
plt.close()
print("Saved: browser_mobile.png")

# ============================================================
# 10. VIDEO PLAYS
# ============================================================
video = pd.read_excel(f, sheet_name='Video Plays', usecols=[0,1])
video = video.dropna(subset=['Video Name'])
print("\n=== VIDEO PLAYS ===")
print(video.to_string(index=False))
print(f"Total video views: {video['Views'].sum():.0f}")

# ============================================================
# 11. REFERRER SITES
# ============================================================
ref = pd.read_excel(f, sheet_name='Referrer Site')
ref = ref.dropna(subset=['Source'])
print("\n=== REFERRER SITES ===")
print(ref.to_string(index=False))

# ============================================================
# 12. PAGE LOAD TIMES
# ============================================================
load = pd.read_excel(f, sheet_name='Page Load Times', usecols=range(6))
load = load.dropna(subset=['Page'])
print("\n=== PAGE LOAD TIMES ===")
print(load.to_string(index=False))

# ============================================================
# 13. AFFINITY CATEGORIES (Top 15)
# ============================================================
aff = pd.read_excel(f, sheet_name='Affinity Categories', usecols=range(10))
aff = aff.dropna(subset=['Affinity Category (reach)'])
print("\n=== AFFINITY CATEGORIES (Top 15) ===")
print(aff.head(15).to_string(index=False))

# ============================================================
# SUMMARY CHART: Key metrics dashboard
# ============================================================
fig, axes = plt.subplots(2, 3, figsize=(18, 10))

# 1. Video plays
ax = axes[0, 0]
v_sorted = video.sort_values('Views', ascending=True)
ax.barh(v_sorted['Video Name'], v_sorted['Views'], color='#E91E63')
ax.set_title('Video Views', fontweight='bold')

# 2. Referrer sources
ax = axes[0, 1]
ref_top = ref.sort_values('Sessions', ascending=True).tail(6)
short_ref = [str(s)[:20] for s in ref_top['Source']]
ax.barh(short_ref, ref_top['Sessions'], color='#00BCD4')
ax.set_title('Top Referrer Sites', fontweight='bold')

# 3. Page load times
ax = axes[0, 2]
short_pages = [p.split('/')[-2] if len(p.split('/')) > 2 else p for p in load['Page']]
ax.bar(short_pages, load['Avg. Page Load Time (sec)'], color='#FF5722')
ax.set_title('Avg Page Load Time (sec)', fontweight='bold')
ax.tick_params(axis='x', rotation=45)

# 4. Affinity categories top 10
ax = axes[1, 0]
aff_top = aff.head(10).sort_values('Sessions', ascending=True)
short_aff = [str(c).split('/')[-1][:25] for c in aff_top['Affinity Category (reach)']]
ax.barh(short_aff, aff_top['Sessions'], color='#9C27B0')
ax.set_title('Top 10 Affinity Categories', fontweight='bold')

# 5. New vs Returning pie
ax = axes[1, 1]
if len(nvr_agg) >= 2:
    types = nvr_agg['User Type'].tolist()[:2]
    nvr_sessions = nvr_agg['Sessions'].tolist()[:2]
    ax.pie(nvr_sessions, labels=types, autopct='%1.1f%%', colors=['#3F51B5', '#FF9800'])
    ax.set_title('New vs Returning Visitors', fontweight='bold')

# 6. Language breakdown
lang = pd.read_excel(f, sheet_name='Language')
lang = lang.dropna(subset=['Language'])
ax = axes[1, 2]
ax.barh(lang['Language'], lang['Sessions'], color='#4CAF50')
ax.set_title('Sessions by Language', fontweight='bold')

plt.tight_layout()
plt.savefig(out / 'dashboard.png', dpi=150)
plt.close()
print("Saved: dashboard.png")

# ============================================================
# BONUS: Conversion funnel analysis from page views
# ============================================================
print("\n=== CONVERSION FUNNEL (Page View Flow) ===")
funnel_pages = ['/', '/2017/06/21/welcome/', '/2017/06/22/power/', '/2017/06/22/say/', '/2017/06/22/finish/']
for p in funnel_pages:
    row = pages[pages['Page'] == p]
    if len(row) > 0:
        r = row.iloc[0]
        print(f"  {p}: {r['Pageviews']:.0f} views, {r['Bounce Rate']*100:.1f}% bounce, {r['% Exit']*100:.1f}% exit, avg time: {r['Avg. Time on Page']:.0f}s")

print("\n=== ANALYSIS COMPLETE ===")
