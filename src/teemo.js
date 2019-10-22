import { SocketService } from './meepo'
import * as THREE from 'three'
import { GUI } from './dat.gui.module'

import mp3 from './biceP.mp3'
let scene, renderer, camera, clock, width, height, video
let particles, videoWidth, videoHeight, imageCache
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
const preloadContainer = document.createElement('div')
document.body.appendChild(preloadContainer)

const desc = document.createElement('div')
desc.style = `font-family: sans-serif;
    text-align: center;
    font-weight: 100;
    font-size:7rem;`
desc.innerHTML = 'you are about to load a 12MB audio file'
preloadContainer.appendChild(desc)

const progWrapper = document.createElement('div')
progWrapper.style = 'display:block;margin:auto;width:80%;margin-top:6rem;'
preloadContainer.appendChild(progWrapper)
const prog = document.createElement('div')
prog.style = `width: 750px;
    background: black;
    margin: auto 0;
    text-align: center;
    height: 90px;`
progWrapper.appendChild(prog)
const bar = document.createElement('div')
bar.style =
  'width:0px;height:90px;position:absolute;background:red;margin:.3rem;'
prog.appendChild(bar)

const corntinue = document.createElement('div')
corntinue.innerHTML = 'CORNTINUE'
corntinue.style = `color: red;
    font-size: 3rem;
    display: block;
    text-align: center;
    background: black;
    font-family: sans-serif;
    width: 34rem;
    border-radius: 2rem;
    user-select: none;
    cursor: pointer;
    height: 10rem;
    line-height: 10rem;
    margin: auto;
    margin-top: 6rem;
    font-weight: bold;
    cursor:pointer;`
preloadContainer.appendChild(corntinue)
corntinue.onclick = initAudio

// const loading = document.createElement('div')
// loading.innerHTML = 'LOADING'
// loading.onclick = init
// loading.style = `color: red;
//     font-size: 5rem;
//     display: block;
//     margin: 0 auto;
//     text-align: center;
//     margin-top: 16rem;
//     background: black;
//     font-family: sans-serif;
//     width: 80%;
//     border-radius: 2rem;
//     user-select:none;
//     cursor:pointer;`
// preloadContainer.appendChild(loading)
// const classNameForLoading = 'loading'

// var s = new SocketService()
// s.init()
// var z
// const observable = s.onZ()
// observable.subscribe(v => (z = v))
// s.onZ(v => {
//   console.log(v)
// })

// audio
let audio, analyser
const fftSize = 2048 // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
const frequencyRange = {
  bass: [20, 140],
  lowMid: [140, 400],
  mid: [400, 2600],
  highMid: [2600, 5200],
  treble: [5200, 14000],
}

function init() {
  preloadContainer.remove()
  // audio.play()
  document.body.addEventListener('click', function() {
    console.log('PLAYCLICK')
    if (audio) {
      if (audio.isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
    }
  })
  var gui = new GUI()
  var parameters = {
    zooooooom: 1,
  }
  gui
    .add(
      parameters,
      'zooooooom',
      window.innerWidth - 100,
      window.innerWidth + 500,
      10,
    )
    .onChange(v => (camera.position.z = v))
  // document.body.classList.add(classNameForLoading)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  renderer = new THREE.WebGLRenderer()
  document.body.appendChild(renderer.domElement)

  clock = new THREE.Clock()

  initCamera()

  onResize()

  if (navigator.mediaDevices) {
    initVideo()
  } else {
    showAlert()
  }

  draw()
}

const initCamera = () => {
  const fov = 45
  const aspect = width / height

  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 10000)
  const z = Math.min(window.innerWidth, window.innerHeight)
  camera.position.set(0, 0, z)
  camera.lookAt(0, 0, 0)

  scene.add(camera)
}

const initVideo = () => {
  video = document.createElement('video')
  video.autoplay = true

  const option = {
    video: true,
    audio: false,
  }
  navigator.mediaDevices
    .getUserMedia(option)
    .then(stream => {
      video.srcObject = stream
      video.addEventListener('loadeddata', () => {
        videoWidth = video.videoWidth
        videoHeight = video.videoHeight

        createParticles()
      })
    })
    .catch(error => {
      console.log(error)
      showAlert()
    })
}

function initAudio() {
  const audioListener = new THREE.AudioListener()
  audio = new THREE.Audio(audioListener)

  const audioLoader = new THREE.AudioLoader()
  audioLoader.load(
    mp3,
    buffer => {
      // document.body.classList.remove(classNameForLoading)
      console.log('higree')
      bar.style.background = 'lightgreen'
      bar.style.width = `750px`
      corntinue.style.color = 'lightgreen'
      corntinue.innerHTML = 'BEGIN'
      corntinue.onclick = init
      audio.setBuffer(buffer)
      audio.setLoop(true)
      audio.setVolume(0.5)
    },
    progress => {
      console.log('PROG', progress)
      corntinue.onclick = ''
      corntinue.innerHTML = 'LOADING...'
      const percent = (progress.loaded / progress.total) * 700
      bar.style.width = `${percent}px`
    },
    error => {
      console.log(error)
    },
  )

  analyser = new THREE.AudioAnalyser(audio, fftSize)
}

const createParticles = () => {
  const imageData = getImageData(video)
  const geometry = new THREE.Geometry()
  geometry.morphAttributes = {} // This is necessary to avoid error.
  const material = new THREE.PointsMaterial({
    size: 1,
    color: 0xff3b6c,
    sizeAttenuation: false,
  })

  for (let y = 0, height = imageData.height; y < height; y += 1) {
    for (let x = 0, width = imageData.width; x < width; x += 1) {
      const vertex = new THREE.Vector3(
        x - imageData.width / 2,
        -y + imageData.height / 2,
        0,
      )
      geometry.vertices.push(vertex)
    }
  }

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

const getImageData = (image, useCache) => {
  if (useCache && imageCache) {
    return imageCache
  }

  const w = image.videoWidth
  const h = image.videoHeight

  canvas.width = w
  canvas.height = h

  ctx.translate(w, 0)
  ctx.scale(-1, 1)

  ctx.drawImage(image, 0, 0)
  imageCache = ctx.getImageData(0, 0, w, h)

  return imageCache
}

/**
 * https://github.com/processing/p5.js-sound/blob/v0.14/lib/p5.sound.js#L1765
 *
 * @param data
 * @param _frequencyRange
 * @returns {number} 0.0 ~ 1.0
 */
const getFrequencyRangeValue = (data, _frequencyRange) => {
  const nyquist = 48000 / 2
  const lowIndex = Math.round((_frequencyRange[0] / nyquist) * data.length)
  const highIndex = Math.round((_frequencyRange[1] / nyquist) * data.length)
  let total = 0
  let numFrequencies = 0

  for (let i = lowIndex; i <= highIndex; i++) {
    total += data[i]
    numFrequencies += 1
  }
  return total / numFrequencies / 255
}

const draw = t => {
  clock.getDelta()
  const time = clock.elapsedTime

  let r, g, b

  // audio
  if (analyser) {
    // analyser.getFrequencyData() would be an array with a size of half of fftSize.
    const data = analyser.getFrequencyData()

    const bass = getFrequencyRangeValue(data, frequencyRange.bass)
    const mid = getFrequencyRangeValue(data, frequencyRange.mid)
    const treble = getFrequencyRangeValue(data, frequencyRange.treble)
    r = bass
    g = mid
    b = treble
  }

  // video
  if (particles) {
    particles.material.color.r = 1 - r
    particles.material.color.g = 1 - g
    particles.material.color.b = 1 - b

    const density = 2
    const useCache = parseInt(t) % 2 === 0 // To reduce CPU usage.
    const imageData = getImageData(video, useCache)
    for (
      let i = 0, length = particles.geometry.vertices.length;
      i < length;
      i++
    ) {
      const particle = particles.geometry.vertices[i]
      if (i % density !== 0) {
        particle.z = 10000
        continue
      }
      let index = i * 4
      let gray =
        (imageData.data[index] +
          imageData.data[index + 1] +
          imageData.data[index + 2]) /
        3
      let threshold = 300
      if (gray < threshold) {
        if (gray < threshold / 3) {
          particle.z = gray * r * 5
        } else if (gray < threshold / 2) {
          particle.z = gray * g * 5
        } else {
          particle.z = gray * b * 5
        }
      } else {
        particle.z = 10000
      }
    }
    particles.geometry.verticesNeedUpdate = true
  }
  // camera.position.z = z
  renderer.render(scene, camera)

  requestAnimationFrame(draw)
}

const showAlert = () => {
  document.getElementById('message').classList.remove('hidden')
}

const onResize = () => {
  width = window.innerWidth
  height = window.innerHeight

  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)

  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', onResize)

// init()
