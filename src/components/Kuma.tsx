import proud from '../assets/kuma/proud.png'
import sad from '../assets/kuma/sad.png'
import wave from '../assets/kuma/wave.png'

const images = { sad, proud, wave }

/** Kuma the CareBear mascot. Sizes come from the Figma frames. */
export function Kuma({ mood, className }: { mood: 'sad' | 'proud' | 'wave'; className?: string }) {
  let size = 'h-[90px] w-[92px]' // sad / proud on the home screen
  if (mood === 'wave') {
    size = 'h-[112px] w-[136px]' // check-in screen
  }
  return (
    <img
      src={images[mood]}
      alt=""
      draggable={false}
      className={`pointer-events-none shrink-0 object-cover select-none ${size} ${className || ''}`}
    />
  )
}
