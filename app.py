from flask import Flask, request, jsonify
import numpy as np
from sklearn.datasets import make_blobs
from flask_cors import CORS


app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

class KMeans:
    def __init__(self, data, k, init_method, selected_points):
        self.data = data
        self.k = k
        self.init_method = init_method
        self.selected_points = selected_points
        self.assignment = [-1 for _ in range(len(data))]
        self.snaps = []
        self.assignment_snaps = []  # New list to store assignments at each step

    
    def snap(self, centers):
        self.snaps.append(centers)
        self.assignment_snaps.append(self.assignment.copy())  # Save a copy of the current assignments


    def isunassigned(self, i):
        return self.assignment[i] == -1

    def initialize(self, type):
        if type == "random":
            return self.data[np.random.choice(len(self.data) - 1, size=self.k, replace=False)]
        elif type == "farthest":
            centers = [self.data[0]]
            for i in range(1, self.k):
                dists = []
                for j in range(len(self.data)):
                    if self.isunassigned(j):
                        dists.append(min([self.dist(center, self.data[j]) for center in centers]))
                centers.append(self.data[dists.index(max(dists))])
            return np.array(centers)
        elif type == "kmeans++":
            centers = [self.data[np.random.choice(len(self.data) - 1)]]
            for i in range(1, self.k):
                dists = []
                for j in range(len(self.data)):
                    if self.isunassigned(j):
                        dists.append(min([self.dist(center, self.data[j])**2 for center in centers]))
                probs = [dist / sum(dists) for dist in dists]  # Normalize using squared distances
                print(sum(probs))
                centers.append(self.data[np.random.choice(len(self.data), p=probs)])
            return np.array(centers)
        elif type == "manual" and self.selected_points:
            return np.array(self.selected_points)

    def make_clusters(self, centers):
        for i in range(len(self.assignment)):
            for j in range(self.k):
                if self.isunassigned(i):
                    self.assignment[i] = j
                    dist = self.dist(centers[j], self.data[i])
                else:
                    new_dist = self.dist(centers[j], self.data[i])
                    if new_dist < dist:
                        self.assignment[i] = j
                        dist = new_dist
                    
        
    def compute_centers(self):
        centers = []
        for i in range(self.k):
            cluster = []
            for j in range(len(self.assignment)):
                if self.assignment[j] == i:
                    cluster.append(self.data[j])
            centers.append(np.mean(np.array(cluster), axis=0))

        return np.array(centers)
    
    def unassign(self):
        self.assignment = [-1 for _ in range(len(self.data))]

    def are_diff(self, centers, new_centers):
        for i in range(self.k):
            if self.dist(centers[i], new_centers[i]) != 0:
                return True
        return False

    def dist(self, x, y):
        # Euclidean distance
        return sum((x - y)**2) ** (1/2)

    def lloyds(self):
        centers = self.initialize(self.init_method)
        self.snap(centers)  # Save the initial centers
        self.make_clusters(centers)
        new_centers = self.compute_centers()
        self.snap(new_centers)
        while self.are_diff(centers, new_centers):
            self.unassign()
            centers = new_centers
            self.make_clusters(centers)
            new_centers = self.compute_centers()
            if self.are_diff(centers, new_centers):
                self.snap(new_centers)
        return

@app.route('/kmeans', methods=['POST'])
def run_kmeans():
    data = request.json.get('data')  # Get the data from the request
    k = request.json.get('k', 4)  # Default to 4 if not provided
    init_method = request.json.get('initMethod', 'random')  # Default to 'random'
    selected_points = request.json.get('selectedPoints', [])

    # Convert the data to a numpy array
    X = np.array(data)

    kmeans = KMeans(X, k, init_method, selected_points)  # Initialize the KMeans class

    
    kmeans.lloyds()
    
    centers_as_lists = [center.tolist() for center in kmeans.snaps]
    assignment_as_lists = [assignment for assignment in kmeans.assignment_snaps]

    return jsonify({'centers': centers_as_lists, 'assignments':assignment_as_lists})  # Return the centers for each iteration


@app.route('/data', methods=['GET'])
def get_data():
    centers = [[0, 0], [2, 2], [-3, 2], [2, -4]]
    X, _ = make_blobs(n_samples=300, centers=centers, cluster_std=1)

    return jsonify(X.tolist())  # Return the generated data as a JSON response


if __name__ == '__main__':
    app.run(debug=True)