// Parliament's mark: three birds, from docs/spec/parliament-birds.svg
// (21 October). Drawn in the current colour, which in the chrome is ink.

const BIRDS = 'M498,685 L544,741 L583,785 L588,799 L590,817 L593,828 L596,828 L604,823 L632,797 L674,770 L727,728 L724,728 L661,762 L620,791 L616,788 L615,779 L612,774 L600,788 L586,767 L567,745 L500,685Z '
  + 'M894,732 L894,755 L896,759 L899,808 L904,852 L922,933 L924,995 L925,997 L929,997 L953,982 L989,951 L1023,931 L1052,910 L1126,848 L1032,903 L990,930 L968,946 L963,945 L962,918 L943,938 L940,938 L922,847Z '
  + 'M651,911 L653,917 L713,1020 L744,1077 L761,1105 L795,1155 L807,1179 L817,1208 L821,1229 L826,1244 L826,1249 L828,1252 L834,1278 L837,1284 L841,1283 L871,1263 L918,1226 L930,1219 L1018,1192 L1080,1168 L1116,1156 L1126,1151 L1194,1129 L1203,1124 L1208,1124 L1187,1126 L1183,1128 L1176,1128 L1128,1138 L1111,1140 L1033,1157 L1002,1166 L918,1196 L890,1210 L888,1208 L886,1173 L883,1149 L882,1148 L848,1188 L843,1192 L833,1176 L823,1153 L784,1086 L762,1053 L707,981Z'

/** @param {{ className?: string, label?: string }} props label: what it is read as; without one it is decoration */
export default function BirdsMark({ className, label }) {
  return (
    <svg
      className={className}
      viewBox="478 665 752 640"
      fill="none"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      <path d={BIRDS} fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  )
}
