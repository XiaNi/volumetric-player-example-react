import React, { useState } from 'react'
import logo from './logo.svg'
import './App.css'
import VolumetricPlayer from "./VolumetricPlayer";

function App() {
  const [playerVisible, setPlayerVisible] = useState(false)
  const [playerSources, setPlayerSources] = useState("")

  const [ manifestFilePath, meshFilePath, videoFilePath ] = playerSources
    .replaceAll("\r", "")
    .split("\n").map(v => v.trim());


  const playerSourcesAreValid = manifestFilePath && meshFilePath && videoFilePath

  return (
    <div className="App">
      {!playerVisible ? <textarea onChange={event => setPlayerSources(event.target.value)} /> : null}
      <button
        className={"button player-toggle"}
        onClick={() => setPlayerVisible(!playerVisible)}>{playerVisible? "off" : "on"}</button>
      {(!playerSourcesAreValid || !playerVisible) ? null : <VolumetricPlayer
        manifestFilePath={manifestFilePath}
        meshFilePath={meshFilePath}
        videoFilePath={videoFilePath}
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh'}}
      />}
    </div>
  )
}

export default App
