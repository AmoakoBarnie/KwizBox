import json, re

IN = r"C:\Users\Amoako\ghana-stem-trivia\scripts\incoming_204_303.json"
data = json.load(open(IN, encoding="utf-8"))

INCONSISTENCY_KW = [
    "doesn't match", "does not match", "inconsistent", "i think there's an error",
    "let me reconsider", "hmm", "schema says", "i'll set answer", "set answer to",
    "no valid", "none work", "error in my setup", "could be wrong",
    "so the correct answer is", "so the answer is",  # tells a different letter than chosen
]

def is_consistent(q):
    opts = q["options"]; ai = q["answer_index"]; letter = q["answer"]
    exp = "AB" if q.get("question_type") == "true_false" else "ABCD"
    if ai is None or ai < 0 or ai >= len(opts):
        return False, f"answer_index {ai} out of range"
    if letter != exp[ai]:
        return False, f"letter {letter} != index {ai} ({exp[ai]})"
    if any(not str(o).strip() for o in opts):
        return False, "empty option"
    return True, ""

def has_inconsistency_text(q):
    e = q.get("explanation", "").lower()
    return [k for k in INCONSISTENCY_KW if k in e]

def recompute(q):
    qid=q["id"]; subj=q["subject"]; opts=q["options"]; ai=q["answer_index"]; qtext=q["question"]
    try:
        if subj == "Mathematics":
            m = re.search(r"(\d+)/(\d+)\s+of\s+a\s+number\s+is\s+(\d+)", qtext)
            if m and "what is" in qtext and "of that number" in qtext:
                a,b,val=int(m.group(1)),int(m.group(2)),int(m.group(3)); n=val*b//a
                m2=re.search(r"what is (\d+)/(\d+)\s+of\s+that\s+number", qtext)
                if m2:
                    c,d=int(m2.group(1)),int(m2.group(2)); correct=n*c//d
                    if opts[ai]!=str(correct): return False,f"frac: expected {correct}, got {opts[ai]}"
            m = re.search(r"What is (\d+)\s*[×x]\s*(\d+)\??$", qtext)
            if m:
                correct=int(m.group(1))*int(m.group(2))
                if opts[ai]!=str(correct): return False,f"mul: expected {correct}, got {opts[ai]}"
            m = re.search(r"What is (\d+)\s*÷\s*(\d+)", qtext)
            if m:
                correct=int(m.group(1))//int(m.group(2))
                if opts[ai]!=str(correct): return False,f"div: expected {correct}, got {opts[ai]}"
            m = re.search(r"What is (\d+)\s*\+\s*(\d+)", qtext)
            if m and "×" not in qtext and "÷" not in qtext:
                correct=int(m.group(1))+int(m.group(2))
                if opts[ai]!=str(correct): return False,f"add: expected {correct}, got {opts[ai]}"
            m = re.search(r"What is (\d+)\s*-\s*(\d+)", qtext)
            if m:
                correct=int(m.group(1))-int(m.group(2))
                if opts[ai]!=str(correct): return False,f"sub: expected {correct}, got {opts[ai]}"
            # profit %
            m = re.search(r"buys an item for.*?(\d+).*?sells it for.*?(\d+).*?profit percentage", qtext, re.S)
            if m:
                cost,sell=int(m.group(1)),int(m.group(2)); correct=(sell-cost)*100//cost
                if opts[ai]!=f"{correct}%": return False,f"profit%: expected {correct}%, got {opts[ai]}"
            # % of N students
            m = re.search(r"(\d+)%.*?(\d+)\s+students.*?how many", qtext, re.S)
            if m:
                p,n=int(m.group(1)),int(m.group(2)); correct=p*n//100
                if opts[ai]!=str(correct): return False,f"pctof: expected {correct}, got {opts[ai]}"
            # % increase 40 to 60
            m = re.search(r"increases? from (\d+).*?to (\d+).*?percentage", qtext, re.S)
            if m:
                a,b=int(m.group(1)),int(m.group(2)); correct=(b-a)*100//a
                if opts[ai]!=f"{correct}%": return False,f"inc%: expected {correct}%, got {opts[ai]}"
            # % decrease / reduced by
            m = re.search(r"costs.*?(\d+).*?reduced by (\d+)%.*?new price", qtext, re.S)
            if m:
                original,disc=int(m.group(1)),int(m.group(2)); correct=original-(original*disc//100)
                if opts[ai]!=f"GH₵{correct}": return False,f"reduce%: expected GH₵{correct}, got {opts[ai]}"
            # ratio boys:girls 3:5, 24 boys
            m = re.search(r"ratio of (\w+) to (\w+).*?(\d+):(\d+).*?(\d+)\s+(\w+)", qtext, re.S)
            if m and ("boys" in qtext.lower() and "girls" in qtext.lower()):
                p,q= int(m.group(3)),int(m.group(4)); given=int(m.group(5))
                if given % p == 0:
                    correct=given//p*q
                    matches=[o for o in opts if o.startswith(str(correct))]
                    if matches and opts[ai]!=matches[0]: return False,f"ratio: expected {matches[0]}, got {opts[ai]}"
            # ratio 2:5 concentrate 10 -> water
            m = re.search(r"ratio (\d+):(\d+).*?(\d+)\s+cups of concentrate", qtext, re.S)
            if m:
                p,q,conc=int(m.group(1)),int(m.group(2)),int(m.group(3))
                if conc % p ==0:
                    correct=conc//p*q
                    matches=[o for o in opts if o.startswith(str(correct))]
                    if matches and opts[ai]!=matches[0]: return False,f"ratio2: expected {matches[0]}, got {opts[ai]}"
            # 2^n
            m = re.search(r"What is 2\^(\d+)", qtext)
            if m:
                correct=2**int(m.group(1))
                if opts[ai]!=str(correct): return False,f"pow2: expected {correct}, got {opts[ai]}"
            # sequence double
            m = re.search(r"pattern (\d+), (\d+), (\d+), (\d+).*?next", qtext)
            if m:
                nums=[int(x) for x in m.groups()]
                if nums[1]==2*nums[0] and nums[2]==2*nums[1]:
                    correct=2*nums[3]
                    if opts[ai]!=str(correct): return False,f"seqdouble: expected {correct}, got {opts[ai]}"
            # sequence +4
            m = re.search(r"sequence is (\d+), (\d+), (\d+), (\d+).*?nth term", qtext)
            if m:
                nums=[int(x) for x in m.groups()]
                if nums[1]-nums[0]==nums[2]-nums[1]==nums[3]-nums[2]:
                    d=nums[1]-nums[0]
                    # nth term = nums[0] + (n-1)d => for n=1 -> a; formula a+(n-1)d
                    # check option 4n+1 etc not needed; just verify next term if asked elsewhere
                    pass
            # area rectangle l x w
            m = re.search(r"length (\d+).*width (\d+).*area", qtext, re.S)
            if m:
                correct=int(m.group(1))*int(m.group(2))
                if opts[ai]!=f"{correct} cm²": return False,f"area: expected {correct} cm², got {opts[ai]}"
            # perimeter rectangle
            m = re.search(r"length (\d+).*width (\d+).*perimeter|walk.*around.*once|distance around", qtext, re.S)
            if m and re.search(r"(\d+)\s*m\s+long.*?(\d+)\s*m\s+wide", qtext, re.S):
                mm=re.search(r"(\d+)\s*m\s+long.*?(\d+)\s*m\s+wide", qtext, re.S)
                correct=2*(int(mm.group(1))+int(mm.group(2)))
                if opts[ai]!=f"{correct} m": return False,f"perim: expected {correct}m, got {opts[ai]}"
            # perimeter twice
            m = re.search(r"(\d+)\s*m\s+by\s+(\d+)\s*m.*walk.*boundary twice", qtext, re.S)
            if m:
                correct=2*(int(m.group(1))+int(m.group(2)))*2
                if opts[ai]!=str(correct): return False,f"perimx2: expected {correct}, got {opts[ai]}"
            # square perimeter -> side -> area
            m = re.search(r"square has a perimeter of (\d+)\s*cm.*area", qtext, re.S)
            if m:
                per=int(m.group(1)); side=per//4; correct=side*side
                if opts[ai]!=f"{correct} cm²": return False,f"sqarea: expected {correct} cm², got {opts[ai]}"
            # rectangle area + length -> width
            m = re.search(r"area of (\d+)\s*cm².*length (\d+)\s*cm.*width", qtext, re.S)
            if m:
                correct=int(m.group(1))//int(m.group(2))
                if opts[ai]!=f"{correct} cm": return False,f"rectw: expected {correct}cm, got {opts[ai]}"
            # volume
            m = re.search(r"dimensions (\d+)cm.*?(\d+)cm.*?(\d+)cm.*volume", qtext, re.S)
            if m:
                correct=int(m.group(1))*int(m.group(2))*int(m.group(3))
                if opts[ai]!=f"{correct} cm³": return False,f"vol: expected {correct}cm³, got {opts[ai]}"
            # speed dist/time
            m = re.search(r"travels (\d+)\s*km.*?(\d+)\s*hours.*average speed", qtext, re.S)
            if m:
                correct=int(m.group(1))//int(m.group(2))
                if opts[ai]!=f"{correct} km/h": return False,f"speed: expected {correct}km/h, got {opts[ai]}"
            # 3x+7=25
            m = re.search(r"3x \+ 7 = 25", qtext)
            if m:
                if opts[ai]!="6": return False,f"3x+7: expected 6, got {opts[ai]}"
            # 2(x+4)=18
            m = re.search(r"2\(x \+ 4\) = 18", qtext)
            if m:
                if opts[ai]!="5": return False,f"2(x+4): expected 5, got {opts[ai]}"
            # 2x-5=13
            m = re.search(r"2x − 5 = 13|2x - 5 = 13", qtext)
            if m:
                if opts[ai]!="9": return False,f"2x-5: expected 9, got {opts[ai]}"
            # x+y=10, x-y=2
            m = re.search(r"x \+ y = 10.*x − y = 2|x \+ y = 10.*x - y = 2", qtext, re.S)
            if m:
                if opts[ai]!="6": return False,f"simxy: expected 6, got {opts[ai]}"
            # mean of 5 numbers =12, four known
            m = re.search(r"mean of five numbers is 12.*?(\d+), (\d+), (\d+).*?(\d+).*?fifth", qtext, re.S)
            if m:
                known=sum(int(x) for x in m.groups()); correct=60-known
                if opts[ai]!=str(correct): return False,f"mean5: expected {correct}, got {opts[ai]}"
            # scores mean
            m = re.search(r"scores are ([\d, ]+)\. What is the mean", qtext, re.S)
            if m:
                nums=[int(x) for x in m.group(1).split(",")]
                correct=sum(nums)//len(nums)
                if opts[ai]!=str(correct): return False,f"mean: expected {correct}, got {opts[ai]}"
            # triangle angles
            m = re.search(r"angles of a triangle are (\d+)° and (\d+)°.*third", qtext, re.S)
            if m:
                correct=180-int(m.group(1))-int(m.group(2))
                if opts[ai]!=f"{correct}°": return False,f"triang: expected {correct}°, got {opts[ai]}"
            # temp 4 fall 9 rise 3
            m = re.search(r"(\d+)°C.*falls? by (\d+)°C.*rises? by (\d+)°C", qtext, re.S)
            if m:
                correct=int(m.group(1))-int(m.group(2))+int(m.group(3))
                if opts[ai]!=f"{correct}°C": return False,f"temp: expected {correct}°C, got {opts[ai]}"
            # money spent
            m = re.search(r"GH₵(\d+).*book for GH₵(\d+).*pen for GH₵(\d+).*remains", qtext, re.S)
            if m:
                correct=int(m.group(1))-int(m.group(2))-int(m.group(3))
                if opts[ai]!=f"GH₵{correct}": return False,f"money: expected GH₵{correct}, got {opts[ai]}"
            # oranges: quarter given, buy 15
            m = re.search(r"(\d+) oranges.*one quarter.*buys (\d+) more.*how many.*now", qtext, re.S)
            if m:
                total=int(m.group(1)); buy=int(m.group(2))
                correct=total-total//4+buy
                if opts[ai]!=str(correct): return False,f"oranges: expected {correct}, got {opts[ai]}"
            # number >40 <60 divisible by 3 and 5
            m = re.search(r"greater than (\d+).*less than (\d+).*divisible by both 3 and 5", qtext, re.S)
            if m:
                if opts[ai]!="45": return False,f"div35: expected 45, got {opts[ai]}"
            # x²=49
            m = re.search(r"x² = 49|x\^2 = 49", qtext)
            if m:
                if opts[ai]!="7": return False,f"x2: expected 7, got {opts[ai]}"
            # even >20 <30 divisible by 3
            m = re.search(r"even.*greater than 20.*less than 30.*divisible by 3", qtext, re.S)
            if m:
                if opts[ai]!="24": return False,f"logic: expected 24, got {opts[ai]}"
            # multiplication boxes
            m = re.search(r"(\d+) boxes.*?(\d+) pencils.*altogether", qtext, re.S)
            if m:
                correct=int(m.group(1))*int(m.group(2))
                if opts[ai]!=str(correct): return False,f"boxes: expected {correct}, got {opts[ai]}"
            # fraction remainder 2/8+3/8
            m = re.search(r"(\d+)/(\d+) of a cake.*?(\d+)/(\d+).*remains", qtext, re.S)
            if m:
                a,b,c,d=int(m.group(1)),int(m.group(2)),int(m.group(3)),int(m.group(4))
                remain=b-a-c  # since a/b + c/b, remain = b-(a+c)
                # find option matching X/b
                want=f"{remain}/{b}"
                if opts[ai]!=want: return False,f"cakerem: expected {want}, got {opts[ai]}"
            # equivalent fraction 3/4
            m = re.search(r"equivalent to 3/4", qtext)
            if m:
                if opts[ai]!="9/12": return False,f"equiv34: expected 9/12, got {opts[ai]}"
            # which greater 5/8 vs 3/5
            m = re.search(r"greater: 5/8 or 3/5", qtext)
            if m:
                if opts[ai]!="5/8": return False,f"greater: expected 5/8, got {opts[ai]}"
            # time lesson 9:35 +45
            m = re.search(r"(\d+):(\d+).*lasts (\d+) minutes.*end", qtext, re.S)
            if m:
                h=int(m.group(1)); mn=int(m.group(2)); add=int(m.group(3))
                t=mn+add; h+=t//60; t%=60
                want=f"{h}:{t:02d}"
                # options are like "10:20 a.m."
                matches=[o for o in opts if o.startswith(want)]
                if matches and opts[ai]!=matches[0]: return False,f"time: expected {matches[0]}, got {opts[ai]}"
            # probability red 3/10
            m = re.search(r"(\d+) red balls and (\d+) blue balls.*probability.*red", qtext, re.S)
            if m:
                r,b=int(m.group(1)),int(m.group(2)); correct=f"{r}/{r+b}"
                if opts[ai]!=correct: return False,f"probred: expected {correct}, got {opts[ai]}"
            # die >4
            m = re.search(r"greater than 4.*on a.*die|greater than 4\?", qtext, re.S)
            if m:
                if opts[ai]!="1/3": return False,f"die: expected 1/3, got {opts[ai]}"
            # not blue balls
            m = re.search(r"(\d+) red, (\d+) blue and (\d+) green.*not blue", qtext, re.S)
            if m:
                r,b,g=int(m.group(1)),int(m.group(2)),int(m.group(3)); correct=f"{(r+g)/(r+b+g)}".rstrip('0').rstrip('.') if (r+b+g)%1==0 else f"{(r+g)}/{r+b+g}"
                correct=f"{r+g}/{r+b+g}"
                if opts[ai]!=correct: return False,f"notblue: expected {correct}, got {opts[ai]}"
    except Exception as ex:
        return None, f"recompute error: {ex}"
    return None, ""

broken=[]; clean=[]
for q in data:
    reasons=[]
    ok,note=is_consistent(q)
    if not ok: reasons.append("CONSISTENCY: "+note)
    hits=has_inconsistency_text(q)
    if hits: reasons.append("TEXT-ADMITS-ERROR: "+", ".join(hits))
    ok2,note2=recompute(q)
    if ok2 is False: reasons.append("MATH: "+note2)
    if reasons: broken.append((q["id"],reasons))
    else: clean.append(q)

print("TOTAL:",len(data))
print("BROKEN:",len(broken))
for qid,r in broken: print(f"  id={qid}: {r}")
print("CLEAN:",len(clean))
print("Clean ids:",[q['id'] for q in clean])
