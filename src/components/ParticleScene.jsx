import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/* ──────────────────────────────────────────
   Shader source – ported from generated-page.html
   ────────────────────────────────────────── */

const vertexShader = `
  uniform float uTime;
  uniform float uDistortion;
  uniform float uSize;
  uniform float uSpread;
  uniform vec2  uMouse;

  varying float vAlpha;
  varying vec3  vPos;

  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+2.0*C.xxx;
    vec3 x3=x0-1.0+3.0*C.xxx;
    i=mod289(i);
    vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=1.0/7.0;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  float rand(vec2 co){
    return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
  }

  void main(){
    vec3 pos=position;
    float noise=snoise(vec3(pos.x*0.4+uTime*0.2,pos.y*0.4,pos.z*0.4));
    vec3 randomScatter=vec3(
      rand(uv+uTime*0.01)-0.5,
      rand(uv+1.0)-0.5,
      rand(uv+2.0)-0.5
    )*uSpread*0.8;
    vec3 dir=normalize(pos);
    float explosion=smoothstep(0.2,1.0,noise)*uDistortion;
    vec3 finalPos=pos+(dir*explosion)+randomScatter;
    float mouseDist=distance(uMouse*10.0,finalPos.xy);
    float mouseForce=smoothstep(4.0,0.0,mouseDist);
    finalPos+=dir*mouseForce*0.5;
    vec4 mvPosition=modelViewMatrix*vec4(finalPos,1.0);
    gl_Position=projectionMatrix*mvPosition;
    gl_PointSize=uSize*(20.0/-mvPosition.z);
    vAlpha=1.0-(uSpread*0.5);
    vPos=finalPos;
  }
`

const fragmentShader = `
  uniform vec3  uColor;
  uniform float uOpacity;

  varying float vAlpha;
  varying vec3  vPos;

  void main(){
    vec2 center=gl_PointCoord-vec2(0.5);
    float dist=length(center);
    if(dist>0.5) discard;
    float alpha=smoothstep(0.5,0.4,dist)*uOpacity*vAlpha;
    float depthColor=smoothstep(-5.0,5.0,vPos.z);
    vec3 finalColor=mix(uColor*0.5,uColor*1.5,depthColor);
    gl_FragColor=vec4(finalColor,alpha);
  }
`

/**
 * Reusable Three.js particle scene.
 * 
 * Props:
 * - spheres: array of { x, y, scale } — positions & scales of each particle sphere
 * - opacity: global opacity multiplier (0-1), default 1
 * - showTrackers: whether to show tracking points & SVG lines, default true
 * - interactive: whether mouse interaction is enabled, default true
 * - particleColor: hex string for particle color, default '#ADB5BD'
 */
export default function ParticleScene({
    spheres = [{ x: 4.0, y: 0, scale: 1.0 }],
    opacity = 1.0,
    showTrackers = true,
    interactive = true,
    particleColor = '#ADB5BD',
}) {
    const canvasRef = useRef(null)
    const trackerBlobRef = useRef(null)
    const trackersContainerRef = useRef(null)
    const svgLinesRef = useRef(null)

    useEffect(() => {
        const container = canvasRef.current
        const trackerBlob = trackerBlobRef.current
        const trackersContainer = trackersContainerRef.current
        const svgLines = svgLinesRef.current
        if (!container) return

        const BG_COLOR = 0x212529

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(BG_COLOR)
        scene.fog = new THREE.FogExp2(BG_COLOR, 0.04)

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
        camera.position.set(0, 0, 22)

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        container.appendChild(renderer.domElement)

        // Create groups for each sphere
        const allGroups = []
        const allOrbits = []
        const allMeshes = []
        const allUniforms = []

        spheres.forEach((cfg, idx) => {
            const mainGroup = new THREE.Group()
            mainGroup.position.x = window.innerWidth < 768 ? 0 : cfg.x
            mainGroup.position.y = cfg.y || 0
            scene.add(mainGroup)

            const radius = 4.5 * (cfg.scale || 1.0)
            const geometry = new THREE.SphereGeometry(radius, 96, 96)
            const uniforms = {
                uTime: { value: idx * 10 }, // offset time so they don't sync
                uDistortion: { value: 0.5 },
                uSize: { value: 3.5 },
                uSpread: { value: 0.0 },
                uColor: { value: new THREE.Color(particleColor) },
                uOpacity: { value: 0.7 * opacity },
                uMouse: { value: new THREE.Vector2(0, 0) },
            }

            const material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms,
                transparent: true,
                depthWrite: false,
                blending: THREE.NormalBlending,
            })

            const particleMesh = new THREE.Points(geometry, material)
            mainGroup.add(particleMesh)

            // Orbits
            const techGroup = new THREE.Group()
            mainGroup.add(techGroup)
            const orbits = []

            function createOrbit(orbitRadius, type = 'thin', tiltX = 0, tiltY = 0, speed = 1.0) {
                let geo, mat
                const orbitOpacity = 0.5 * opacity
                if (type === 'thin') {
                    geo = new THREE.TorusGeometry(orbitRadius, 0.006, 6, 120)
                    mat = new THREE.MeshBasicMaterial({ color: 0xced4da, transparent: true, opacity: orbitOpacity })
                } else if (type === 'dotted') {
                    const pts = []
                    const count = 64
                    for (let i = 0; i < count; i++) {
                        const theta = (i / count) * Math.PI * 2
                        pts.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, Math.sin(theta) * orbitRadius, 0))
                    }
                    geo = new THREE.BufferGeometry().setFromPoints(pts)
                    mat = new THREE.PointsMaterial({ color: 0xced4da, size: 0.03, transparent: true, opacity: orbitOpacity })
                } else if (type === 'dashed') {
                    geo = new THREE.RingGeometry(orbitRadius, orbitRadius + 0.02, 64, 1)
                    mat = new THREE.MeshBasicMaterial({ color: 0xced4da, transparent: true, opacity: orbitOpacity * 0.5, side: THREE.DoubleSide })
                }
                const mesh = type === 'dotted' ? new THREE.Points(geo, mat) : new THREE.Mesh(geo, mat)
                mesh.rotation.x = tiltX
                mesh.rotation.y = tiltY
                techGroup.add(mesh)
                orbits.push({
                    mesh,
                    baseOpacity: orbitOpacity,
                    speedVector: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.01 * speed,
                        (Math.random() - 0.5) * 0.01 * speed,
                        (Math.random() - 0.5) * 0.01 * speed,
                    ),
                })
            }

            const s = cfg.scale || 1.0
            createOrbit(5.8 * s, 'thin', Math.PI / 2, 0, 1.5)
            createOrbit(6.2 * s, 'dotted', Math.PI / 3, Math.PI / 6, 0.8)
            createOrbit(5.2 * s, 'thin', 0, Math.PI / 2, 2.0)
            createOrbit(6.8 * s, 'dashed', Math.PI / 1.5, Math.PI / 4, 0.5)
            createOrbit(7.5 * s, 'thin', Math.PI / 4, 0, 0.6)

            allGroups.push(mainGroup)
            allOrbits.push(orbits)
            allMeshes.push(particleMesh)
            allUniforms.push(uniforms)
        })

        // Tracking points (only for the first sphere, if enabled)
        const trackingPoints = []
        const lineElements = []

        if (showTrackers && allGroups.length > 0) {
            const r = 4.5 * (spheres[0].scale || 1.0)
            const pts = [
                { pos: new THREE.Vector3(0, r * 0.6, r * 0.5), label: 'HI-01', el: null },
                { pos: new THREE.Vector3(-r * 0.5, -r * 0.2, r * 0.6), label: 'MID-X', el: null },
                { pos: new THREE.Vector3(r * 0.5, -r * 0.4, r * 0.5), label: 'LO-Z', el: null },
            ]

            pts.forEach((point) => {
                const div = document.createElement('div')
                div.className = 'point-marker'
                div.innerHTML = `
          <div class="point-dot"></div>
          <div class="point-corner pc-tl"></div>
          <div class="point-corner pc-br"></div>
          <div class="point-label">${point.label}</div>
        `
                trackersContainer.appendChild(div)
                point.el = div
                trackingPoints.push(point)
            })

            const pairs = [[0, 1], [1, 2], [2, 0]]
            pairs.forEach((pair) => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
                line.setAttribute('class', pair[0] === 0 ? 'svg-line active' : 'svg-line')
                svgLines.appendChild(line)
                lineElements.push({ el: line, p1: pair[0], p2: pair[1] })
            })
        }

        // Floating exchange nodes between spheres
        const exchangeNodes = []
        if (spheres.length >= 2) {
            for (let i = 0; i < spheres.length; i++) {
                for (let j = i + 1; j < spheres.length; j++) {
                    // Create 3 exchange nodes between each pair
                    for (let n = 0; n < 3; n++) {
                        const nodeGeo = new THREE.SphereGeometry(0.1, 12, 12)
                        const nodeMat = new THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.9 * opacity,
                        })
                        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
                        scene.add(nodeMesh)
                        exchangeNodes.push({
                            mesh: nodeMesh,
                            from: i,
                            to: j,
                            progress: n / 3,
                            speed: 0.15 + Math.random() * 0.1,
                            returning: n % 2 === 0,
                        })
                    }
                }
            }
        }

        // Mutable state
        let time = 0
        const flowSpeed = 0.15
        const orbitSpeedMult = 1.0
        let mouseX = 0
        let mouseY = 0
        const tempVec = new THREE.Vector3()

        const onMouseMove = (e) => {
            if (!interactive) return
            mouseX = (e.clientX / window.innerWidth) * 2 - 1
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1
            allUniforms.forEach(u => u.uMouse.value.set(mouseX, mouseY))
        }
        document.addEventListener('mousemove', onMouseMove)

        let animId
        function animate() {
            animId = requestAnimationFrame(animate)
            time += 0.01 * flowSpeed * 3.0

            allMeshes.forEach((mesh, idx) => {
                mesh.rotation.y += 0.003
                mesh.rotation.z = Math.sin(time * 0.2 + idx) * 0.05
                allUniforms[idx].uTime.value += 0.01 * flowSpeed * 3.0
            })

            allOrbits.forEach((orbits, gIdx) => {
                orbits.forEach((orbit, i) => {
                    const speed = orbit.speedVector.clone().multiplyScalar(orbitSpeedMult * 2.0)
                    orbit.mesh.rotation.x += speed.x
                    orbit.mesh.rotation.y += speed.y
                    orbit.mesh.rotation.z += speed.z
                    orbit.mesh.rotation.x += Math.sin(time * 0.5 + i + gIdx) * 0.001 * orbitSpeedMult
                    orbit.mesh.rotation.y += Math.cos(time * 0.3 + i + gIdx) * 0.001 * orbitSpeedMult
                })
            })

            allGroups.forEach((group, idx) => {
                group.position.y = (spheres[idx].y || 0) + Math.sin(time * 0.5 + idx * 2) * 0.2
                if (window.innerWidth < 768) group.position.y += 1.5

                if (interactive) {
                    const targetRotationY = mouseX * 0.3
                    const targetRotationX = mouseY * 0.2
                    group.rotation.y += (targetRotationY - group.rotation.y) * 0.08
                    group.rotation.x += (targetRotationX - group.rotation.x) * 0.08
                } else {
                    group.rotation.y += 0.002
                }
            })

            // Animate exchange nodes between spheres
            exchangeNodes.forEach((node) => {
                node.progress += node.speed * 0.01
                if (node.progress > 1) {
                    node.progress = 0
                    node.returning = !node.returning
                }

                const fromGroup = allGroups[node.returning ? node.to : node.from]
                const toGroup = allGroups[node.returning ? node.from : node.to]

                const t = node.progress
                // Curved path between spheres
                const fromPos = fromGroup.position
                const toPos = toGroup.position
                const midY = (fromPos.y + toPos.y) / 2 + Math.sin(t * Math.PI) * 3
                const midZ = Math.sin(t * Math.PI) * 2

                node.mesh.position.x = fromPos.x + (toPos.x - fromPos.x) * t
                node.mesh.position.y = fromPos.y + (toPos.y - fromPos.y) * t + Math.sin(t * Math.PI) * 3
                node.mesh.position.z = midZ

                // Pulse size
                const pulse = 0.8 + Math.sin(t * Math.PI) * 0.4
                node.mesh.scale.setScalar(pulse)
                node.mesh.material.opacity = Math.sin(t * Math.PI) * 0.9 * opacity
            })

            // Update tracking points
            if (showTrackers && trackingPoints.length > 0) {
                const screenPoints = []
                trackingPoints.forEach((pt) => {
                    tempVec.copy(pt.pos)
                    tempVec.applyEuler(allMeshes[0].rotation)
                    tempVec.applyMatrix4(allMeshes[0].matrix)
                    tempVec.applyMatrix4(allGroups[0].matrixWorld)
                    tempVec.project(camera)
                    const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth
                    const y = (-(tempVec.y * 0.5) + 0.5) * window.innerHeight
                    screenPoints.push({ x, y })
                    pt.el.style.transform = `translate(${x}px, ${y}px)`
                })

                lineElements.forEach((line) => {
                    const p1 = screenPoints[line.p1]
                    const p2 = screenPoints[line.p2]
                    line.el.setAttribute('x1', p1.x)
                    line.el.setAttribute('y1', p1.y)
                    line.el.setAttribute('x2', p2.x)
                    line.el.setAttribute('y2', p2.y)
                })

                const avgX = screenPoints.reduce((a, b) => a + b.x, 0) / screenPoints.length
                const avgY = screenPoints.reduce((a, b) => a + b.y, 0) / screenPoints.length
                trackerBlob.style.left = `${avgX}px`
                trackerBlob.style.top = `${avgY}px`
            }

            renderer.render(scene, camera)
        }
        animate()

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
            allGroups.forEach((group, idx) => {
                group.position.x = window.innerWidth < 768 ? 0 : spheres[idx].x
            })
        }
        window.addEventListener('resize', onResize)

        return () => {
            cancelAnimationFrame(animId)
            document.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('resize', onResize)
            renderer.dispose()
            allMeshes.forEach(m => { m.geometry.dispose(); m.material.dispose() })
            exchangeNodes.forEach(n => { n.mesh.geometry.dispose(); n.mesh.material.dispose() })
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
            while (trackersContainer.firstChild) trackersContainer.removeChild(trackersContainer.firstChild)
            while (svgLines.firstChild) svgLines.removeChild(svgLines.firstChild)
        }
    }, [])

    return (
        <>
            {showTrackers && <div id="tracker-blob" ref={trackerBlobRef} />}
            <svg id="tracker-lines" ref={svgLinesRef} style={{ opacity: showTrackers ? 1 : 0 }} />
            <div id="trackers-container" ref={trackersContainerRef} style={{ opacity: showTrackers ? 1 : 0 }} />
            <div ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
        </>
    )
}
