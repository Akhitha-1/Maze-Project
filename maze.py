import numpy as np, random
def generate_maze(rows, cols):
    if rows % 2 == 0: rows += 1
    if cols % 2 == 0: cols += 1
    maze = [[0]*cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            maze[r][c] = 0
    stack=[(1,1)]; maze[1][1]=1
    dirs=[(-2,0),(2,0),(0,-2),(0,2)]
    while stack:
        r,c = stack[-1]
        neighbors=[]
        for dr,dc in dirs:
            nr,nc = r+dr, c+dc
            if 1<=nr<rows-1 and 1<=nc<cols-1 and maze[nr][nc]==0:
                neighbors.append((nr,nc,dr,dc))
        if neighbors:
            nr,nc,dr,dc = random.choice(neighbors)
            maze[r+dr//2][c+dc//2]=1
            maze[nr][nc]=1
            stack.append((nr,nc))
        else:
            stack.pop()
    return np.array(maze, dtype=np.uint8)

def maze_to_grid(maze):
    return 1 - maze
