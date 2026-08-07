import { useState } from 'react'
import ForgedMinionGame from './components/forged-minion'

function App() {
  const [count, setCount] = useState(0)

  return (
    <ForgedMinionGame />
  )
}

export default App
