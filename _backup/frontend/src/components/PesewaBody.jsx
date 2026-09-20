import { motion } from 'framer-motion'

export default function PesewaBody({ walking, currentArm, currentLeg, walkCycle, state }) {
  return (
    <>
      {/* shadow */}
      {!walking && <ellipse cx="60" cy="133" rx="34" ry="5" fill="rgba(0,0,0,0.10)"/>}
      {walking && <motion.ellipse cx="60" cy="130" rx={37} ry={5} fill="rgba(0,0,0,0.10)" animate={{scaleX:[0.85,1.05,0.95,1.05,0.85],scaleY:[0.6,0.45,0.7,0.5,0.6]}} transition={{duration:0.5,repeat:Infinity,ease:'easeInOut'}}/>}

      {/* legs / base: dark grey block */}
      <rect x="47" y="108" width="26" height="20" rx="4" fill="#4a4a4a" stroke="#3a3a3a" strokeWidth="0.5"/>
      <rect x="48.5" y="108" width="23" height="2.5" fill="#5a5a5a" opacity="0.35"/>
      <ellipse cx="54" cy="128" rx="4.5" ry="2" fill="#3a3a3a"/>
      <ellipse cx="66" cy="128" rx="4.5" ry="2" fill="#3a3a3a"/>

      {/* LEFT arm: tan cylinder */}
      {!walking && (<motion.g style={{transformOrigin:'36px 78px'}} animate={walking?{rotate:[-22,20,-22]}:{rotate:currentArm.shoulder}} transition={walking?{duration:0.45,repeat:Infinity,ease:'easeInOut'}:{duration:0.3}}>
        <rect x="27" y="76" width="9" height="22" rx="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.5"/>
        <circle cx="31.5" cy="100" r="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.3"/>
        <line x1="29" y1="103" x2="28" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="31.5" y1="104" x2="31.5" y2="107" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="34" y1="103" x2="35" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
      </motion.g>)}
      {walking && (<motion.g style={{transformOrigin:'36px 78px'}} animate={{rotate:walkCycle.bind(null,0.25)}} transition={{duration:0.5,repeat:Infinity,ease:'easeInOut'}}>
        <rect x="27" y="76" width="9" height="22" rx="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.5"/>
        <circle cx="31.5" cy="100" r="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.3"/>
        <line x1="29" y1="103" x2="28" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="31.5" y1="104" x2="31.5" y2="107" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="34" y1="103" x2="35" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
      </motion.g>)}

      {/* RIGHT arm: tan cylinder */}
      {!walking && (<motion.g style={{transformOrigin:'84px 78px'}} animate={walking?{rotate:[22,-22,22]}:{rotate:-currentArm.shoulder}} transition={walking?{duration:0.45,repeat:Infinity,ease:'easeInOut'}:{duration:0.3}}>
        <rect x="84" y="76" width="9" height="22" rx="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.5"/>
        <circle cx="88.5" cy="100" r="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.3"/>
        <line x1="86" y1="103" x2="85" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="89.5" y1="104" x2="89.5" y2="107" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="92" y1="103" x2="93" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
      </motion.g>)}
      {walking && (<motion.g style={{transformOrigin:'84px 78px'}} animate={{rotate:walkCycle.bind(null,0.75)}} transition={{duration:0.5,repeat:Infinity,ease:'easeInOut'}}>
        <rect x="84" y="76" width="9" height="22" rx="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.5"/>
        <circle cx="88.5" cy="100" r="4.5" fill="#c4a68d" stroke="#a08060" strokeWidth="0.3"/>
        <line x1="86" y1="103" x2="85" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="89.5" y1="104" x2="89.5" y2="107" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="92" y1="103" x2="93" y2="106" stroke="#8b6040" strokeWidth="0.9" strokeLinecap="round"/>
      </motion.g>)}

      {/* torso: white chest sphere + brown mid-section */}
      <circle cx="60" cy="82" r="14" fill="#e8e4e0" stroke="#c8c4c0" strokeWidth="0.7"/>
      <path d="M48 92 Q60 86 72 92 L70 104 Q60 108 50 104 Z" fill="#bcaaa4" stroke="#9c7c60" strokeWidth="0.6"/>
      {/* kente accent on chest (Ghana flag: green+gold) */}
      <path d="M54 86 L60 90 L66 86" fill="none" stroke="#006B3F" strokeWidth="1.8" strokeLinecap="round" opacity="0.85"/>
      <path d="M54 90 L60 94 L66 90" fill="none" stroke="#CE1126" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
      <circle cx="60" cy="93" r="1.1" fill="#cdd8d2"/>
      <circle cx="60" cy="97" r="1.1" fill="#cdd8d2"/>

      {/* head: grey-brown faceted cranium + brown jaw (no hair — matches uploaded mascot) */}
      <path d="M44 58 Q43 40 60 38 Q77 40 76 58 Q70 50 60 50 Q50 50 44 58 Z" fill="#8c7e75" stroke="#6a5c50" strokeWidth="0.5"/>
      <ellipse cx="60" cy="68" rx="13" ry="6.5" fill="#a68b6f" stroke="#8a6b50" strokeWidth="0.4"/>

      {/* face: minimal — blank for thinking (stoic, matches image), smile for celebrate, dot for encourage */}
      {state === "celebrate" && <path d="M53 67 Q60 72 67 67" stroke="#3a2a1a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>}
      {state === "encourage" && <circle cx="60" cy="68" r="1.6" fill="#3a2a1a"/>}
      {/* thinking: no features — faceless/stoic, matching the uploaded mascot aesthetic */}
    </>
  )
}
