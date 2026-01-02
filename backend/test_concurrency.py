import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.runtime.executor import agent_executor

async def consumer(name, generator):
    print(f"[{name}] Connected.")
    logs = []
    async for log in generator:
        print(f"[{name}] Received: {log}")
        logs.append(log)
    print(f"[{name}] Finished. Total logs: {len(logs)}")
    return logs

async def main():
    print("Starting concurrency test...")
    run_id = 12345
    code = "import time\nprint('Log 1')\ntime.sleep(1)\nprint('Log 2')\ntime.sleep(1)\nprint('Log 3')"
    
    # Start execution (this makes the run "active")
    # We need a primary consumer that kicks it off essentially, 
    # but execute_stream is both the starter and the stream.
    # So we call it twice.
    
    stream1 = agent_executor.execute_stream("Agent", run_id, code)
    
    # Give it a moment to start
    task1 = asyncio.create_task(consumer("Client1", stream1))
    await asyncio.sleep(0.5)
    
    # Client 2 joins late
    stream2 = agent_executor.execute_stream("Agent", run_id, code)
    task2 = asyncio.create_task(consumer("Client2", stream2))
    
    await asyncio.gather(task1, task2)
    print("Test complete.")

if __name__ == "__main__":
    asyncio.run(main())
