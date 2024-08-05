const load = async (webgpu) => {
    const isWebGPUavailable = "gpu" in navigator;

    if (webgpu && !isWebGPUavailable) {
        console.warn("WebGPU is not available in this browser.");
    }

    const runtime =
        webgpu && isWebGPUavailable
            ? await import("onnxruntime-web/webgpu")
            : await import("onnxruntime-web");

    runtime.env.wasm.numThreads = Math.max(
        1,
        navigator.hardwareConcurrency - 2
    );

    return runtime;
};

export const useModel = () => {
    return {
        run: async (webgpu) => {
            const { InferenceSession, Tensor } = await load(webgpu);

            const model_binary = await fetch("wav2vec2.onnx");
            const model_uint8 = new Uint8Array(
                await model_binary.arrayBuffer()
            );

            const session = await InferenceSession.create(model_uint8, {
                executionProviders: webgpu ? ["webgpu"] : undefined,
                enableProfiling: false,
            });

            // simulating 4 10s audio chunks at 16Mhz + a little padding, 
            // same setup i have in my project
            let audioChunks = []
            for( let i = 0; i < 4; i++) {
                audioChunks.push(new Float32Array(160800))
                audioChunks[i].fill(0)
            }

            console.time('onnx');

            for(let i = 0; i < audioChunks.length; i++) {
                console.time(`step onnx ${i}`);
                const audio = audioChunks[i];
                const inputTensor = new Tensor("float32", audio, [1, audio.length]);
                const result = await session.run({
                    [session.inputNames[0]]: inputTensor,
                });
                const res = result[session.outputNames[0]];
                console.timeEnd(`step onnx ${i}`);
            }

            await session.release();

            console.timeEnd('onnx');

            
            
        },
    };
};
