import { useEffect, useRef } from "react";

interface InteractivePlexusProps {
  theme?: "light" | "dark";
}

export default function InteractivePlexus({ theme = "dark" }: InteractivePlexusProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Particle[] = [];
    const maxParticles = width < 768 ? 40 : 85;
    const connectionRadius = 140;
    
    // Mouse interaction parameters
    const mouse = { x: -1000, y: -1000, radius: 180 };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseRadius: number;
      radius: number;
      hue: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.baseRadius = Math.random() * 1.8 + 1.2;
        this.radius = this.baseRadius;
        this.hue = Math.random() < 0.4 ? 180 : 210; // Cyan vs Indigo tones
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce back wall limits
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Magnetic hover reaction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x -= (dx / dist) * force * 1.2;
          this.y -= (dy / dist) * force * 1.2;
          this.radius = this.baseRadius * (1 + force * 1.5);
        } else {
          this.radius = this.baseRadius;
        }
      }

      draw(context: CanvasRenderingContext2D) {
        // Dynamic styling for nodes
        const isDark = theme === "dark";
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Solid glow colors
        const fillAlpha = isDark ? "0.85" : "0.55";
        context.fillStyle = this.hue === 180 
          ? `rgba(6, 182, 212, ${fillAlpha})` // Cyan
          : `rgba(99, 102, 241, ${fillAlpha})`; // Indigo
        
        context.fill();

        // High fidelity glow halo on hovering closer to active cursor
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius / 1.5) {
          context.beginPath();
          context.arc(this.x, this.y, this.radius * 3.5, 0, Math.PI * 2);
          context.fillStyle = this.hue === 180
            ? "rgba(6, 182, 212, 0.08)"
            : "rgba(99, 102, 241, 0.07)";
          context.fill();
        }
      }
    }

    // Populate particles queue space
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    const drawConnections = (context: CanvasRenderingContext2D) => {
      const isDark = theme === "dark";
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionRadius) {
            const alpha = (1 - dist / connectionRadius) * (isDark ? 0.16 : 0.11);
            context.beginPath();
            context.moveTo(particles[i].x, particles[i].y);
            context.lineTo(particles[j].x, particles[j].y);

            // Set stunning neon gradient connector style
            const grad = context.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            );
            
            if (isDark) {
              grad.addColorStop(0, `rgba(6, 182, 212, ${alpha})`); // Cyan
              grad.addColorStop(1, `rgba(99, 102, 241, ${alpha * 0.7})`); // Indigo
            } else {
              grad.addColorStop(0, `rgba(14, 116, 144, ${alpha})`); // Darker Cyan
              grad.addColorStop(1, `rgba(67, 56, 202, ${alpha * 0.7})`); // Darker Indigo
            }

            context.strokeStyle = grad;
            context.lineWidth = (1 - dist / connectionRadius) * 1.1;
            context.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Render subtle overlay radial gradient on mouse cursor to act as a volumetric spotlight
      const isDark = theme === "dark";
      if (mouse.x > -1000) {
        ctx.save();
        const spotGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius * 1.5
        );
        if (isDark) {
          spotGrad.addColorStop(0, "rgba(6, 182, 212, 0.045)");
          spotGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
        } else {
          spotGrad.addColorStop(0, "rgba(14, 116, 144, 0.03)");
          spotGrad.addColorStop(1, "rgba(14, 116, 144, 0)");
        }
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      drawConnections(ctx);
      animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      
      // Adapt particle density to the container sizing
      const newCount = width < 768 ? 40 : 85;
      if (particles.length > newCount) {
        particles.splice(newCount);
      } else {
        const diff = newCount - particles.length;
        for (let i = 0; i < diff; i++) {
          particles.push(new Particle());
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    // Listen to parent bounding container resize events safely
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas.parentElement || document.body);

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Initial frame kickoff
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto mix-blend-normal z-0 opacity-80"
      style={{ pointerEvents: "auto", display: "block" }}
    />
  );
}
