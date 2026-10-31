# 3D Flight Simulator

A browser-based 3D flight simulator built with **Three.js** and **Vite**. Fly an airplane over procedural endless terrain with dynamic weather conditions, responsive flight physics, customizable camera views, and head-up display (HUD) flight instruments.

## Features

- **Realistic Flight Dynamics**: Pitch, bank roll, yaw steering, lift, drag, throttle power, and auto-leveling stabilization.
- **Procedural Infinite Terrain**: Chunk-based procedural terrain with heightmaps generated via Simplex Noise.
- **Dynamic Weather System**: Switch seamlessly between Clear, Cloudy, Rain, and Snow environments with matching atmospheric fog and particle effects.
- **HUD & Flight Instruments**: Real-time cockpit indicators for airspeed (KM/H), altitude (M), compass heading, and current weather state.
- **Multiple Camera Angles**: 3rd-person chase camera, close follow camera, and wide-angle orbit camera.
- **Desktop & Mobile Support**: Full keyboard controls for desktop and on-screen virtual joystick / throttle controls for touch devices.

## Controls

### Keyboard (Desktop)

| Key | Action |
| --- | --- |
| <kbd>W</kbd> | Pitch Down (Dive / descend) |
| <kbd>S</kbd> | Pitch Up (Climb / ascend) |
| <kbd>A</kbd> | Turn Left (Bank & yaw left) |
| <kbd>D</kbd> | Turn Right (Bank & yaw right) |
| <kbd>Shift</kbd> | Increase Throttle |
| <kbd>Ctrl</kbd> | Decrease Throttle |
| <kbd>C</kbd> | Switch Camera View |
| <kbd>R</kbd> | Cycle Weather Conditions |

### Touch / Mobile

- **Virtual Joystick (Left Side)**: Control pitch and steering.
- **Throttle Slider (Right Side)**: Adjust engine thrust.

## Tech Stack

- **[Three.js](https://threejs.org/)**: 3D scene rendering, lighting, shadows, and materials.
- **[simplex-noise](https://github.com/jwagner/simplex-noise.js)**: Procedural heightmap and terrain chunk generation.
- **[Vite](https://vitejs.dev/)**: Fast local development and bundle optimization.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/trunone/simple_flight.git
   cd simple_flight
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the Vite development server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

To create an optimized production build in the `dist` folder:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

## License

This project is licensed under the [MIT License](LICENSE).
