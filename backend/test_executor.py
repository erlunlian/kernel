import asyncio
import sys
import os

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.runtime.executor import agent_executor

async def main():
    print("Starting executor test...")
    try:
        async for log in agent_executor.execute_stream(
            agent_name="TestAgent",
            run_id=999,
            code="print('Hello from E2B!')",
            dependencies=""
        ):
            print(f"Log: {log}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
